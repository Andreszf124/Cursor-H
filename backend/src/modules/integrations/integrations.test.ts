import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
}));

vi.mock('../../infrastructure/database/supabase.client.js', () => ({
  getAnonClient: () => ({ auth: { getUser: mocks.getUser } }),
  getServiceClient: () => ({
    from: () => ({ insert: async () => ({ error: null }) }),
  }),
  createUserClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
      upsert: () => ({
        select: () => ({
          single: async () => ({ data: { id: 'int-1', provider: 'teams' }, error: null }),
        }),
      }),
    }),
  }),
}));

import { buildApp } from '../../app.js';

const AUTH = { authorization: 'Bearer valid-token-a' };

describe('módulo integrations + onboarding', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockImplementation((token: string) =>
      token === 'valid-token-a'
        ? Promise.resolve({
            data: { user: { id: 'user-a', email: 'a@universidad.edu' } },
            error: null,
          })
        : Promise.resolve({ data: { user: null }, error: { message: 'invalid' } }),
    );
  });

  it('GET /integrations/teams/auth-url sin Azure env retorna available false', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/integrations/teams/auth-url',
      headers: AUTH,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ available: boolean }>()).toEqual({ available: false });
  });

  it('POST callback rechaza password (RF-050)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/integrations/teams/callback',
      headers: AUTH,
      payload: { code: 'abc', password: 'secret' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST campus/connect rechaza password (RF-050)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/integrations/campus/connect',
      headers: AUTH,
      payload: {
        campus_url: 'https://campus.ucr.ac.cr',
        username: 'estudiante',
        password: 'no-guardar',
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST campus/import retorna cursos demo', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/integrations/campus/import',
      headers: AUTH,
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ demo: boolean; courses: unknown[] }>();
    expect(body.demo).toBe(true);
    expect(body.courses.length).toBeGreaterThan(0);
  });

  it('GET teams/courses retorna cursos demo', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/integrations/teams/courses',
      headers: AUTH,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ demo: boolean; courses: unknown[] }>();
    expect(body.demo).toBe(true);
    expect(body.courses).toHaveLength(3);
  });
});
