import type { z } from 'zod';
import type {
  deleteAccountSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from './auth.schemas.js';

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

export interface AuthUserDTO {
  id: string;
  email: string;
}

export interface AuthSessionDTO {
  access_token: string;
  refresh_token: string;
}

export interface AuthResult {
  user: AuthUserDTO;
  /** null cuando Supabase requiere confirmación de email antes de iniciar sesión */
  session: AuthSessionDTO | null;
}
