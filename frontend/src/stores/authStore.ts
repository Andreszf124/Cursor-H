import { create } from 'zustand';

/**
 * Sesión SOLO en memoria (decisión declarada del proyecto, SECURITY.md §4):
 * sin persist middleware, sin localStorage/sessionStorage — un XSS no puede
 * robar tokens de un storage persistente. Consecuencia aceptada: al refrescar
 * la página se pierde la sesión y hay que volver a iniciar sesión.
 */

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
}

interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  setAuth: (user: AuthUser, session: AuthSession) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  setAuth: (user, session) => set({ user, session }),
  clear: () => set({ user: null, session: null }),
}));
