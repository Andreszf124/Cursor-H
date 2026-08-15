import { env } from '../../config/env.js';
import {
  getAnonClient,
  getServiceClient,
} from '../../infrastructure/database/supabase.client.js';
import { AppError, UnauthorizedError } from '../../shared/errors/app-error.js';
import type { AuthResult, LoginInput, RegisterInput } from './auth.types.js';

const AVATARS_BUCKET = 'avatars';

export class AuthService {
  /**
   * RF-001 — Registro con email y contraseña (Supabase Auth hashea; nunca almacenamos passwords).
   * En development con DEV_AUTO_CONFIRM_REGISTER: crea el usuario vía admin (sin email)
   * para evitar rate limits del SMTP de Supabase en local.
   */
  async register(input: RegisterInput): Promise<AuthResult> {
    if (env.NODE_ENV === 'development' && env.DEV_AUTO_CONFIRM_REGISTER) {
      return this.registerLocalAutoConfirm(input);
    }

    const { data, error } = await getAnonClient().auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        // El trigger on_auth_user_created crea el perfil con este full_name
        data: { full_name: input.full_name },
      },
    });

    if (error) {
      this.throwRegisterError(error);
    }

    if (!data.user) {
      throw new AppError('No se pudo completar el registro', 400, 'REGISTER_FAILED');
    }

    return {
      user: { id: data.user.id, email: data.user.email ?? input.email },
      session: data.session
        ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          }
        : null,
    };
  }

  /** Solo local: admin.createUser + login — no envía correo de confirmación. */
  private async registerLocalAutoConfirm(input: RegisterInput): Promise<AuthResult> {
    const { data, error } = await getServiceClient().auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.full_name },
    });

    if (error) {
      this.throwRegisterError(error);
    }

    if (!data.user) {
      throw new AppError('No se pudo completar el registro', 400, 'REGISTER_FAILED');
    }

    const { data: sessionData, error: loginError } = await getAnonClient().auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (loginError || !sessionData.session) {
      // Usuario creado; sesión puede fallar si Auth aún exige confirmación en el proyecto
      return {
        user: { id: data.user.id, email: data.user.email ?? input.email },
        session: null,
      };
    }

    return {
      user: { id: data.user.id, email: data.user.email ?? input.email },
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
      },
    };
  }

  private throwRegisterError(error: {
    code?: string;
    message: string;
    status?: number;
  }): never {
    if (error.code === 'user_already_exists' || /already (registered|exists)/i.test(error.message)) {
      throw new AppError('El correo ya está registrado', 409, 'EMAIL_EXISTS');
    }
    if (error.code === 'email_address_invalid' || /email.*invalid/i.test(error.message)) {
      throw new AppError('Correo electrónico inválido', 400, 'EMAIL_INVALID');
    }
    if (
      error.code === 'email_provider_disabled' ||
      /email signups are disabled/i.test(error.message)
    ) {
      throw new AppError(
        'El registro por email está desactivado en Supabase. Activa el provider Email y “Enable sign ups”.',
        400,
        'EMAIL_SIGNUPS_DISABLED',
      );
    }
    if (error.code === 'over_email_send_rate_limit' || /rate limit/i.test(error.message)) {
      throw new AppError(
        'Demasiados correos de confirmación. En local usa DEV_AUTO_CONFIRM_REGISTER=true o desactiva “Confirm email” en Authentication (pantalla general, no el modal de Email).',
        429,
        'EMAIL_RATE_LIMIT',
      );
    }
    console.error('[auth.register] supabase error', {
      code: error.code,
      message: error.message,
      status: error.status,
    });
    throw new AppError('No se pudo completar el registro', 400, 'REGISTER_FAILED');
  }

  /** RF-002 — Inicio de sesión. Error genérico: no revelar si el email existe */
  async login(input: LoginInput): Promise<AuthResult> {
    const { data, error } = await getAnonClient().auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error || !data.user || !data.session) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    return {
      user: { id: data.user.id, email: data.user.email ?? input.email },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    };
  }

  /**
   * RF-003 — Logout. Revoca los refresh tokens del usuario server-side
   * (operación de auth admin — uso legítimo del service role).
   * El frontend descarta el access token en memoria; la revocación es best-effort.
   */
  async logout(accessToken: string): Promise<void> {
    await getServiceClient()
      .auth.admin.signOut(accessToken)
      .catch(() => {
        // Best-effort: si el token ya expiró, el logout sigue siendo válido
      });
  }

  /** RF-004 — Solicitar recuperación. Respuesta siempre genérica (no revelar existencia del email) */
  async forgotPassword(email: string, redirectTo: string): Promise<void> {
    await getAnonClient()
      .auth.resetPasswordForEmail(email, { redirectTo })
      .catch(() => {
        // Silencioso: la respuesta al cliente es genérica en cualquier caso
      });
  }

  /** RF-004 — Confirmar reset con el recovery token del enlace de Supabase */
  async resetPassword(recoveryToken: string, password: string): Promise<void> {
    const { data, error } = await getAnonClient().auth.getUser(recoveryToken);

    if (error || !data.user) {
      throw new UnauthorizedError('Enlace de recuperación inválido o expirado');
    }

    const { error: updateError } = await getServiceClient().auth.admin.updateUserById(
      data.user.id,
      { password },
    );

    if (updateError) {
      throw new AppError('No se pudo actualizar la contraseña', 500, 'RESET_FAILED');
    }
  }

  /**
   * RF-009 — Eliminación de cuenta con re-confirmación de contraseña.
   * Limpia Storage y elimina el usuario de Auth; el FK on delete cascade
   * purga profiles y learning_preferences (RF-158).
   * userId proviene SIEMPRE del JWT verificado, nunca del body.
   */
  async deleteAccount(userId: string, email: string, password: string): Promise<void> {
    const { error: reauthError } = await getAnonClient().auth.signInWithPassword({
      email,
      password,
    });

    if (reauthError) {
      throw new UnauthorizedError('Contraseña incorrecta');
    }

    const service = getServiceClient();

    // Limpieza de archivos del usuario en Storage (SECURITY.md §15)
    const { data: files } = await service.storage.from(AVATARS_BUCKET).list(userId);
    if (files && files.length > 0) {
      await service.storage
        .from(AVATARS_BUCKET)
        .remove(files.map((file) => `${userId}/${file.name}`));
    }

    const { error } = await service.auth.admin.deleteUser(userId);
    if (error) {
      throw new AppError('No se pudo eliminar la cuenta', 500, 'DELETE_FAILED');
    }
  }
}

export const authService = new AuthService();
