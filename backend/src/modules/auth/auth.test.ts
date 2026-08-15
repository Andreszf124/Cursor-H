import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  getUser: vi.fn(),
  adminSignOut: vi.fn(),
  adminDeleteUser: vi.fn(),
  adminUpdateUserById: vi.fn(),
  adminCreateUser: vi.fn(),
  storageList: vi.fn(),
  storageRemove: vi.fn(),
}));

vi.mock('../../infrastructure/database/supabase.client.js', () => ({
  getAnonClient: () => ({
    auth: {
      signUp: mocks.signUp,
      signInWithPassword: mocks.signInWithPassword,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      getUser: mocks.getUser,
    },
  }),
  getServiceClient: () => ({
    auth: {
      admin: {
        signOut: mocks.adminSignOut,
        deleteUser: mocks.adminDeleteUser,
        updateUserById: mocks.adminUpdateUserById,
        createUser: mocks.adminCreateUser,
      },
    },
    storage: {
      from: () => ({ list: mocks.storageList, remove: mocks.storageRemove }),
    },
  }),
  createUserClient: () => ({}),
}));

import { buildApp } from '../../app.js';

const USER_A = { id: 'user-a', email: 'a@universidad.edu' };
const SESSION = { access_token: 'access-a', refresh_token: 'refresh-a' };

function setDefaultMocks(): void {
  mocks.signUp.mockResolvedValue({ data: { user: USER_A, session: SESSION }, error: null });
  mocks.signInWithPassword.mockResolvedValue({
    data: { user: USER_A, session: SESSION },
    error: null,
  });
  mocks.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  mocks.getUser.mockImplementation((token: string) =>
    token === 'valid-token-a' || token === 'recovery-token'
      ? Promise.resolve({ data: { user: USER_A }, error: null })
      : Promise.resolve({ data: { user: null }, error: { message: 'invalid JWT' } }),
  );
  mocks.adminSignOut.mockResolvedValue({ data: null, error: null });
  mocks.adminDeleteUser.mockResolvedValue({ data: {}, error: null });
  mocks.adminUpdateUserById.mockResolvedValue({ data: { user: USER_A }, error: null });
  mocks.adminCreateUser.mockResolvedValue({ data: { user: USER_A }, error: null });
  mocks.storageList.mockResolvedValue({ data: [], error: null });
  mocks.storageRemove.mockResolvedValue({ data: [], error: null });
}

describe('módulo auth', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    setDefaultMocks();
  });

  describe('POST /api/v1/auth/register (RF-001)', () => {
    it('registra un usuario y retorna 201 con user y session', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'a@universidad.edu', password: 'Password123', full_name: 'Ana Mora' },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json<{ user: { id: string }; session: { access_token: string } }>();
      expect(body.user.id).toBe('user-a');
      expect(body.session.access_token).toBe('access-a');
      expect(mocks.signUp).toHaveBeenCalledWith({
        email: 'a@universidad.edu',
        password: 'Password123',
        options: { data: { full_name: 'Ana Mora' } },
      });
    });

    it('rechaza email inválido con 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'no-es-email', password: 'Password123', full_name: 'Ana' },
      });
      expect(res.statusCode).toBe(400);
      expect(mocks.signUp).not.toHaveBeenCalled();
    });

    it('rechaza contraseña menor a 8 caracteres con 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'a@universidad.edu', password: 'corta', full_name: 'Ana' },
      });
      expect(res.statusCode).toBe(400);
      expect(mocks.signUp).not.toHaveBeenCalled();
    });

    it('retorna 409 si el correo ya está registrado', async () => {
      mocks.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { code: 'user_already_exists', message: 'User already registered' },
      });
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'a@universidad.edu', password: 'Password123', full_name: 'Ana' },
      });
      expect(res.statusCode).toBe(409);
    });

    it('retorna session null cuando se requiere confirmación de email', async () => {
      mocks.signUp.mockResolvedValue({ data: { user: USER_A, session: null }, error: null });
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'a@universidad.edu', password: 'Password123', full_name: 'Ana' },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json<{ session: null }>().session).toBeNull();
    });
  });

  describe('POST /api/v1/auth/login (RF-002)', () => {
    it('inicia sesión y retorna 200 con user y session', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'a@universidad.edu', password: 'Password123' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json<{ session: { refresh_token: string } }>().session.refresh_token).toBe(
        'refresh-a',
      );
    });

    it('retorna 401 con mensaje genérico ante credenciales inválidas', async () => {
      mocks.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'a@universidad.edu', password: 'incorrecta1' },
      });
      expect(res.statusCode).toBe(401);
      const body = res.json<{ error: { message: string } }>();
      expect(body.error.message).toBe('Credenciales inválidas');
      // No debe filtrar detalles del proveedor
      expect(body.error.message).not.toMatch(/supabase|invalid login/i);
    });
  });

  describe('POST /api/v1/auth/logout (RF-003)', () => {
    it('retorna 401 sin token', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/v1/auth/logout' });
      expect(res.statusCode).toBe(401);
    });

    it('retorna 401 con token inválido', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: { authorization: 'Bearer token-falso' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('cierra sesión con token válido y revoca tokens', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: { authorization: 'Bearer valid-token-a' },
      });
      expect(res.statusCode).toBe(204);
      expect(mocks.adminSignOut).toHaveBeenCalledWith('valid-token-a');
    });
  });

  describe('POST /api/v1/auth/forgot-password (RF-004)', () => {
    it('retorna mensaje genérico sin revelar si el email existe', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'cualquiera@universidad.edu' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json<{ message: string }>().message).toMatch(/si el correo existe/i);
    });
  });

  describe('POST /api/v1/auth/reset-password (RF-004)', () => {
    it('retorna 401 con recovery token inválido', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        headers: { authorization: 'Bearer token-vencido' },
        payload: { password: 'NuevaPassword1' },
      });
      expect(res.statusCode).toBe(401);
      expect(mocks.adminUpdateUserById).not.toHaveBeenCalled();
    });

    it('actualiza la contraseña con recovery token válido', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        headers: { authorization: 'Bearer recovery-token' },
        payload: { password: 'NuevaPassword1' },
      });
      expect(res.statusCode).toBe(200);
      expect(mocks.adminUpdateUserById).toHaveBeenCalledWith('user-a', {
        password: 'NuevaPassword1',
      });
    });
  });

  describe('DELETE /api/v1/auth/account (RF-009)', () => {
    it('retorna 401 si la contraseña de confirmación es incorrecta', async () => {
      mocks.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/account',
        headers: { authorization: 'Bearer valid-token-a' },
        payload: { password: 'incorrecta1' },
      });
      expect(res.statusCode).toBe(401);
      expect(mocks.adminDeleteUser).not.toHaveBeenCalled();
    });

    it('elimina la cuenta usando el id del JWT, ignorando student_id del body (anti-IDOR)', async () => {
      mocks.storageList.mockResolvedValue({
        data: [{ name: 'avatar.png' }],
        error: null,
      });
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/account',
        headers: { authorization: 'Bearer valid-token-a' },
        // student_id malicioso en el body: debe ignorarse
        payload: { password: 'Password123', student_id: 'user-victima' },
      });
      expect(res.statusCode).toBe(204);
      expect(mocks.adminDeleteUser).toHaveBeenCalledWith('user-a');
      expect(mocks.adminDeleteUser).not.toHaveBeenCalledWith('user-victima');
      expect(mocks.storageRemove).toHaveBeenCalledWith(['user-a/avatar.png']);
    });
  });

  describe('rate limiting (SECURITY.md §8)', () => {
    it('retorna 429 al exceder 10 intentos de login por minuto', async () => {
      // App aislada para no contaminar los contadores del resto de tests
      const freshApp = await buildApp();
      mocks.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      let lastStatus = 0;
      for (let i = 0; i < 11; i += 1) {
        const res = await freshApp.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: { email: 'a@universidad.edu', password: 'incorrecta1' },
        });
        lastStatus = res.statusCode;
      }

      expect(lastStatus).toBe(429);
      await freshApp.close();
    });
  });
});
