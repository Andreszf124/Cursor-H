import { apiFetch } from '../../../services/api/client';
import type { AuthResponse, MessageResponse } from '../types';

export const authService = {
  register(input: { full_name: string; email: string; password: string }): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('/api/v1/auth/register', { method: 'POST', body: input });
  },

  login(input: { email: string; password: string }): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('/api/v1/auth/login', { method: 'POST', body: input });
  },

  logout(): Promise<void> {
    return apiFetch<void>('/api/v1/auth/logout', { method: 'POST' });
  },

  forgotPassword(email: string): Promise<MessageResponse> {
    return apiFetch<MessageResponse>('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
  },

  /** El recovery token viene del hash de la URL del enlace de Supabase, no del store */
  resetPassword(password: string, recoveryToken: string): Promise<MessageResponse> {
    return apiFetch<MessageResponse>('/api/v1/auth/reset-password', {
      method: 'POST',
      body: { password },
      headers: { Authorization: `Bearer ${recoveryToken}` },
    });
  },

  deleteAccount(password: string): Promise<void> {
    return apiFetch<void>('/api/v1/auth/account', { method: 'DELETE', body: { password } });
  },
};
