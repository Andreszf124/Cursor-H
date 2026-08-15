import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

vi.mock('../../infrastructure/database/supabase.client.js', () => ({
  getAnonClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: null }, error: { message: 'invalid' } }),
    },
  }),
  getServiceClient: () => ({}),
  createUserClient: () => ({}),
}));

import { buildApp } from '../../app.js';

describe('módulos restantes auth gate', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    '/api/v1/materials',
    '/api/v1/notifications',
    '/api/v1/checkins',
    '/api/v1/knowledge-gaps',
    '/api/v1/progress/overview',
    '/api/v1/learning-plans',
    '/api/v1/resources',
    '/api/v1/preparation/next',
    '/api/v1/integrations',
    '/api/v1/integrations/teams/auth-url',
    '/api/v1/admin/quotas/me',
  ])('retorna 401 sin token en %s', async (url) => {
    const res = await app.inject({ method: 'GET', url });
    expect(res.statusCode).toBe(401);
  });
});
