import type { AuthSession, AuthUser } from '../../../stores/authStore';

export interface AuthResponse {
  user: AuthUser;
  /** null cuando Supabase requiere confirmación de email antes de iniciar sesión */
  session: AuthSession | null;
}

export interface MessageResponse {
  message: string;
}
