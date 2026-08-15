import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './authStore';

const USER = { id: 'user-1', email: 'ana@universidad.edu' };
const SESSION = { access_token: 'access-1', refresh_token: 'refresh-1' };

describe('authStore (sesión en memoria)', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it('inicia sin usuario ni sesión', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
  });

  it('setAuth guarda usuario y sesión', () => {
    useAuthStore.getState().setAuth(USER, SESSION);
    const state = useAuthStore.getState();
    expect(state.user).toEqual(USER);
    expect(state.session).toEqual(SESSION);
  });

  it('clear elimina usuario y sesión', () => {
    useAuthStore.getState().setAuth(USER, SESSION);
    useAuthStore.getState().clear();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
  });

  it('no persiste nada en localStorage ni sessionStorage', () => {
    useAuthStore.getState().setAuth(USER, SESSION);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
