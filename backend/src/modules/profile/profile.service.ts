import { createUserClient } from '../../infrastructure/database/supabase.client.js';
import { AppError, NotFoundError, ValidationError } from '../../shared/errors/app-error.js';
import { detectImageType } from '../../shared/utils/file-validation.js';
import type {
  AvatarUploadResult,
  LearningPreferencesDTO,
  ProfileDTO,
  UpdatePreferencesInput,
  UpdateProfileInput,
} from './profile.types.js';

const AVATARS_BUCKET = 'avatars';
const ALLOWED_AVATAR_MIMES = ['image/jpeg', 'image/png'];

/**
 * Todas las queries usan createUserClient(jwt): RLS activo — la base de datos
 * garantiza que solo se accede a filas del propio usuario (RF-010, defensa en
 * profundidad además del filtro explícito por userId del JWT).
 */
export class ProfileService {
  /** RF-005 — Perfil + preferencias */
  async getProfile(token: string, userId: string): Promise<ProfileDTO> {
    const supabase = createUserClient(token);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, language, timezone, onboarding_completed')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new AppError('No se pudo obtener el perfil', 500, 'DB_ERROR');
    }
    if (!profile) {
      throw new NotFoundError('Perfil no encontrado');
    }

    const preferences = await this.findPreferences(token, userId);

    return { ...(profile as Omit<ProfileDTO, 'learning_preferences'>), learning_preferences: preferences };
  }

  /** RF-005, RF-007, RF-008 — Actualización parcial de perfil (+ preferencias anidadas) */
  async updateProfile(
    token: string,
    userId: string,
    input: UpdateProfileInput,
  ): Promise<ProfileDTO> {
    const supabase = createUserClient(token);
    const { learning_preferences: preferences, ...profileFields } = input;

    if (Object.keys(profileFields).length > 0) {
      const { error } = await supabase.from('profiles').update(profileFields).eq('id', userId);
      if (error) {
        throw new AppError('No se pudo actualizar el perfil', 500, 'DB_ERROR');
      }
    }

    if (preferences && Object.keys(preferences).length > 0) {
      await this.upsertPreferences(token, userId, preferences);
    }

    return this.getProfile(token, userId);
  }

  /** Marca el wizard inicial como terminado. Career/prefs ya se guardaron paso a paso. */
  async completeOnboarding(token: string, userId: string): Promise<ProfileDTO> {
    const supabase = createUserClient(token);
    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', userId);
    if (error) {
      throw new AppError('No se pudo completar la configuración inicial', 500, 'DB_ERROR');
    }
    return this.getProfile(token, userId);
  }

  /** RF-007 — Solo preferencias */
  async getPreferences(token: string, userId: string): Promise<LearningPreferencesDTO | null> {
    return this.findPreferences(token, userId);
  }

  /** RF-007 — Upsert de preferencias */
  async updatePreferences(
    token: string,
    userId: string,
    input: UpdatePreferencesInput,
  ): Promise<LearningPreferencesDTO | null> {
    await this.upsertPreferences(token, userId, input);
    return this.findPreferences(token, userId);
  }

  /**
   * RF-006 — Subida de avatar. Valida magic bytes (nunca extensión ni
   * Content-Type declarado), nombre generado server-side (SECURITY.md R3).
   */
  async uploadAvatar(
    token: string,
    userId: string,
    buffer: Buffer,
    declaredMime: string,
  ): Promise<AvatarUploadResult> {
    const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
    if (buffer.length > MAX_AVATAR_BYTES) {
      throw new ValidationError('El avatar no puede superar los 2MB');
    }

    const detected = detectImageType(buffer);

    if (!detected || !ALLOWED_AVATAR_MIMES.includes(detected.mime)) {
      throw new ValidationError('El archivo debe ser una imagen JPEG o PNG válida');
    }
    if (detected.mime !== declaredMime) {
      throw new ValidationError('El contenido del archivo no coincide con el tipo declarado');
    }

    const supabase = createUserClient(token);
    const path = `${userId}/avatar.${detected.ext}`;

    const { error: uploadError } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(path, buffer, { contentType: detected.mime, upsert: true });

    if (uploadError) {
      throw new AppError('No se pudo subir el avatar', 500, 'STORAGE_ERROR');
    }

    const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
    const avatarUrl = data.publicUrl;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId);

    if (updateError) {
      throw new AppError('No se pudo actualizar el perfil', 500, 'DB_ERROR');
    }

    return { avatar_url: avatarUrl };
  }

  /** RF-006 — Eliminar avatar */
  async deleteAvatar(token: string, userId: string): Promise<void> {
    const supabase = createUserClient(token);

    // Nombres server-side conocidos: avatar.jpg | avatar.png
    await supabase.storage
      .from(AVATARS_BUCKET)
      .remove([`${userId}/avatar.jpg`, `${userId}/avatar.png`]);

    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', userId);

    if (error) {
      throw new AppError('No se pudo actualizar el perfil', 500, 'DB_ERROR');
    }
  }

  private async findPreferences(
    token: string,
    userId: string,
  ): Promise<LearningPreferencesDTO | null> {
    const supabase = createUserClient(token);

    const { data, error } = await supabase
      .from('learning_preferences')
      .select(
        'learning_style, session_duration_minutes, difficulty_preference, techniques, preferred_study_hours',
      )
      .eq('student_id', userId)
      .maybeSingle();

    if (error) {
      throw new AppError('No se pudieron obtener las preferencias', 500, 'DB_ERROR');
    }

    return (data as LearningPreferencesDTO | null) ?? null;
  }

  private async upsertPreferences(
    token: string,
    userId: string,
    input: UpdatePreferencesInput,
  ): Promise<void> {
    const supabase = createUserClient(token);

    // student_id se fija server-side desde el JWT — cualquier valor del body ya fue descartado por Zod
    const { error } = await supabase
      .from('learning_preferences')
      .upsert({ student_id: userId, ...input }, { onConflict: 'student_id' });

    if (error) {
      throw new AppError('No se pudieron guardar las preferencias', 500, 'DB_ERROR');
    }
  }
}

export const profileService = new ProfileService();
