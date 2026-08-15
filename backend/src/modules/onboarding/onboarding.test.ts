import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

interface MockState {
  profileRow: Record<string, unknown> | null;
  prefsRow: Record<string, unknown> | null;
  profileUpdates: Record<string, unknown>[];
}

const state = vi.hoisted<MockState>(() => ({
  profileRow: null,
  prefsRow: null,
  profileUpdates: [],
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
              if (state.profileRow) Object.assign(state.profileRow, payload);
              return { eq: () => Promise.resolve({ error: null }) };
            },
          }
        : {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: state.prefsRow, error: null }),
              }),
            }),
            upsert: () => Promise.resolve({ error: null }),
          },
  }),
}));

import { buildApp } from '../../app.js';

const AUTH = { authorization: 'Bearer valid-token-a' };

describe('POST /api/v1/onboarding/complete', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    state.profileUpdates = [];
    state.prefsRow = null;
    state.profileRow = {
      id: 'user-a',
      full_name: 'Ana Mora',
      avatar_url: null,
      language: 'es',
      timezone: 'America/Costa_Rica',
      onboarding_completed: false,
    };
    mocks.getUser.mockImplementation((token: string) =>
      token === 'valid-token-a'
        ? Promise.resolve({
            data: { user: { id: 'user-a', email: 'a@universidad.edu' } },
            error: null,
          })
        : Promise.resolve({ data: { user: null }, error: { message: 'invalid' } }),
    );
  });

  it('retorna 401 sin token', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/onboarding/complete' });
    expect(res.statusCode).toBe(401);
  });

  it('marca onboarding_completed en el perfil', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/onboarding/complete',
      headers: AUTH,
    });
    expect(res.statusCode).toBe(200);
    expect(state.profileUpdates.some((row) => row.onboarding_completed === true)).toBe(true);
    expect(res.json<{ onboarding_completed: boolean }>().onboarding_completed).toBe(true);
  });
});
