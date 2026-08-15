import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

interface MockState {
  profileRow: Record<string, unknown> | null;
  prefsRow: Record<string, unknown> | null;
  profileUpdates: Record<string, unknown>[];
  prefsUpserts: { payload: Record<string, unknown>; options: unknown }[];
  uploads: { path: string; size: number }[];
  removed: string[][];
}

const state = vi.hoisted<MockState>(() => ({
  profileRow: null,
  prefsRow: null,
  profileUpdates: [],
  prefsUpserts: [],
  uploads: [],
  removed: [],
}));

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
}));

vi.mock('../../infrastructure/database/supabase.client.js', () => ({
  getAnonClient: () => ({ auth: { getUser: mocks.getUser } }),
  getServiceClient: () => ({}),
  createUserClient: () => ({
    from: (table: string) =>
      table === 'profiles'
        ? {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: state.profileRow, error: null }),
              }),
            }),
            update: (payload: Record<string, unknown>) => {
              state.profileUpdates.push(payload);
              return { eq: () => Promise.resolve({ error: null }) };
            },
          }
        : {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: state.prefsRow, error: null }),
              }),
            }),
            upsert: (payload: Record<string, unknown>, options: unknown) => {
              state.prefsUpserts.push({ payload, options });
              return Promise.resolve({ error: null });
            },
          },
    storage: {
      from: () => ({
        upload: (path: string, buffer: Buffer) => {
          state.uploads.push({ path, size: buffer.length });
          return Promise.resolve({ error: null });
        },
        remove: (paths: string[]) => {
          state.removed.push(paths);
          return Promise.resolve({ data: [], error: null });
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://cdn.test/avatars/${path}` },
        }),
      }),
    },
  }),
}));

import { buildApp } from '../../app.js';

const PROFILE_ROW = {
  id: 'user-a',
  full_name: 'Ana Mora',
  avatar_url: null,
  language: 'es',
  timezone: 'America/Costa_Rica',
  onboarding_completed: false,
};

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const GIF_BYTES = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00, 0x00, 0x00]);

function multipartPayload(contentType: string, content: Buffer): {
  payload: Buffer;
  headers: Record<string, string>;
} {
  const boundary = 'X-TEST-BOUNDARY';
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="avatar"\r\nContent-Type: ${contentType}\r\n\r\n`,
    ),
    content,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return {
    payload,
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
  };
}

const AUTH_A = { authorization: 'Bearer valid-token-a' };

describe('módulo profile', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    state.profileRow = { ...PROFILE_ROW };
    state.prefsRow = null;
    state.profileUpdates = [];
    state.prefsUpserts = [];
    state.uploads = [];
    state.removed = [];
    mocks.getUser.mockImplementation((token: string) =>
      token === 'valid-token-a'
        ? Promise.resolve({ data: { user: { id: 'user-a', email: 'a@universidad.edu' } }, error: null })
        : Promise.resolve({ data: { user: null }, error: { message: 'invalid JWT' } }),
    );
  });

  describe('autenticación requerida (RF-010)', () => {
    it('retorna 401 sin token en todas las rutas de perfil', async () => {
      for (const [method, url] of [
        ['GET', '/api/v1/profile'],
        ['PATCH', '/api/v1/profile'],
        ['POST', '/api/v1/profile/avatar'],
        ['DELETE', '/api/v1/profile/avatar'],
        ['GET', '/api/v1/profile/preferences'],
        ['PATCH', '/api/v1/profile/preferences'],
      ] as const) {
        const res = await app.inject({ method, url });
        expect(res.statusCode, `${method} ${url}`).toBe(401);
      }
    });

    it('retorna 401 con token inválido', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/profile',
        headers: { authorization: 'Bearer token-falso' },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/profile (RF-005)', () => {
    it('retorna el perfil del usuario autenticado con preferencias', async () => {
      state.prefsRow = {
        learning_style: 'visual',
        session_duration_minutes: 45,
        difficulty_preference: 'adaptive',
        techniques: ['pomodoro'],
        preferred_study_hours: null,
      };
      const res = await app.inject({ method: 'GET', url: '/api/v1/profile', headers: AUTH_A });
      expect(res.statusCode).toBe(200);
      const body = res.json<{ id: string; learning_preferences: { learning_style: string } }>();
      expect(body.id).toBe('user-a');
      expect(body.learning_preferences.learning_style).toBe('visual');
    });

    it('retorna 404 (nunca 403) si el perfil no existe', async () => {
      state.profileRow = null;
      const res = await app.inject({ method: 'GET', url: '/api/v1/profile', headers: AUTH_A });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/v1/profile (RF-005, RF-007, RF-008)', () => {
    it('actualiza campos permitidos y descarta id/student_id del body (anti-IDOR)', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/profile',
        headers: AUTH_A,
        payload: {
          full_name: 'Ana M. Mora',
          language: 'en',
          id: 'user-victima',
          student_id: 'user-victima',
        },
      });
      expect(res.statusCode).toBe(200);
      expect(state.profileUpdates).toHaveLength(1);
      expect(state.profileUpdates[0]).toEqual({ full_name: 'Ana M. Mora', language: 'en' });
      expect(state.profileUpdates[0]).not.toHaveProperty('id');
      expect(state.profileUpdates[0]).not.toHaveProperty('student_id');
    });

    it('actualiza preferencias anidadas via upsert con student_id del JWT', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/profile',
        headers: AUTH_A,
        payload: { learning_preferences: { learning_style: 'auditory' } },
      });
      expect(res.statusCode).toBe(200);
      expect(state.prefsUpserts).toHaveLength(1);
      expect(state.prefsUpserts[0]?.payload).toEqual({
        student_id: 'user-a',
        learning_style: 'auditory',
      });
    });

    it('rechaza idioma fuera del enum es/en con 400', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/profile',
        headers: AUTH_A,
        payload: { language: 'fr' },
      });
      expect(res.statusCode).toBe(400);
      expect(state.profileUpdates).toHaveLength(0);
    });

    it('rechaza body sin campos con 400', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/profile',
        headers: AUTH_A,
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/profile/avatar (RF-006)', () => {
    it('sube un PNG válido y actualiza avatar_url con nombre server-side', async () => {
      const { payload, headers } = multipartPayload('image/png', PNG_BYTES);
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/profile/avatar',
        headers: { ...headers, ...AUTH_A },
        payload,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json<{ avatar_url: string }>().avatar_url).toBe(
        'https://cdn.test/avatars/user-a/avatar.png',
      );
      expect(state.uploads[0]?.path).toBe('user-a/avatar.png');
      expect(state.profileUpdates[0]).toEqual({
        avatar_url: 'https://cdn.test/avatars/user-a/avatar.png',
      });
    });

    it('rechaza archivo cuyo contenido no es JPEG/PNG aunque declare image/png (magic bytes)', async () => {
      const { payload, headers } = multipartPayload('image/png', GIF_BYTES);
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/profile/avatar',
        headers: { ...headers, ...AUTH_A },
        payload,
      });
      expect(res.statusCode).toBe(400);
      expect(state.uploads).toHaveLength(0);
    });

    it('rechaza cuando el MIME declarado no coincide con el contenido real', async () => {
      const { payload, headers } = multipartPayload('image/jpeg', PNG_BYTES);
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/profile/avatar',
        headers: { ...headers, ...AUTH_A },
        payload,
      });
      expect(res.statusCode).toBe(400);
      expect(state.uploads).toHaveLength(0);
    });

    it('rechaza archivos mayores a 2MB con 400', async () => {
      const bigContent = Buffer.concat([PNG_BYTES, Buffer.alloc(2 * 1024 * 1024)]);
      const { payload, headers } = multipartPayload('image/png', bigContent);
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/profile/avatar',
        headers: { ...headers, ...AUTH_A },
        payload,
      });
      expect(res.statusCode).toBe(400);
      expect(state.uploads).toHaveLength(0);
    });
  });

  describe('DELETE /api/v1/profile/avatar (RF-006)', () => {
    it('elimina los objetos de Storage y limpia avatar_url', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/profile/avatar',
        headers: AUTH_A,
      });
      expect(res.statusCode).toBe(204);
      expect(state.removed[0]).toEqual(['user-a/avatar.jpg', 'user-a/avatar.png']);
      expect(state.profileUpdates[0]).toEqual({ avatar_url: null });
    });
  });

  describe('preferencias (RF-007)', () => {
    it('GET retorna null si aún no hay preferencias', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/profile/preferences',
        headers: AUTH_A,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json<{ preferences: null }>().preferences).toBeNull();
    });

    it('PATCH hace upsert fijando student_id desde el JWT e ignorando el del body', async () => {
      state.prefsRow = {
        learning_style: null,
        session_duration_minutes: 60,
        difficulty_preference: 'adaptive',
        techniques: [],
        preferred_study_hours: null,
      };
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/profile/preferences',
        headers: AUTH_A,
        payload: { session_duration_minutes: 60, student_id: 'user-victima' },
      });
      expect(res.statusCode).toBe(200);
      expect(state.prefsUpserts[0]?.payload).toEqual({
        student_id: 'user-a',
        session_duration_minutes: 60,
      });
    });

    it('rechaza session_duration_minutes fuera de rango con 400', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/profile/preferences',
        headers: AUTH_A,
        payload: { session_duration_minutes: 999 },
      });
      expect(res.statusCode).toBe(400);
      expect(state.prefsUpserts).toHaveLength(0);
    });
  });
});
