import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

const mocks = vi.hoisted(() => ({ getUser: vi.fn() }));

vi.mock('../../infrastructure/database/supabase.client.js', async () => {
  const { createFakeSupabase, testStore } = await import('../../test/fake-supabase.js');
  return {
    getAnonClient: () => ({ auth: { getUser: mocks.getUser } }),
    getServiceClient: () => createFakeSupabase(testStore),
    createUserClient: () => createFakeSupabase(testStore),
  };
});

import { buildApp } from '../../app.js';
import { testStore } from '../../test/fake-supabase.js';

const AUTH = { authorization: 'Bearer valid-token-a' };
const PERIOD_ID = '00000000-0000-4000-8000-0000000000d1';
const COURSE_ID = '00000000-0000-4000-8000-0000000000f1';
const FOREIGN_COURSE_ID = '00000000-0000-4000-8000-0000000000f9';

describe('módulo checkins', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    testStore.reset();
    testStore.seed('academic_periods', [
      { id: PERIOD_ID, student_id: 'user-a', name: '2026-I', is_active: true },
    ]);
    testStore.seed('courses', [
      {
        id: COURSE_ID,
        student_id: 'user-a',
        name: 'Cálculo I',
        academic_period_id: PERIOD_ID,
        modality: 'in_person',
      },
      {
        id: FOREIGN_COURSE_ID,
        student_id: 'user-b',
        name: 'Curso ajeno',
        academic_period_id: PERIOD_ID,
        modality: 'in_person',
      },
    ]);
    mocks.getUser.mockImplementation((token: string) =>
      token === 'valid-token-a'
        ? Promise.resolve({
            data: { user: { id: 'user-a', email: 'a@universidad.edu' } },
            error: null,
          })
        : Promise.resolve({ data: { user: null }, error: { message: 'invalid' } }),
    );
  });

  it('completa un check-in propio y sugiere reforzar temas con baja comprensión', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/checkins',
      headers: AUTH,
      payload: { course_id: COURSE_ID, class_date: '2026-08-15' },
    });
    expect(createRes.statusCode).toBe(201);
    const checkinId = createRes.json<{ id: string }>().id;

    await app.inject({
      method: 'PATCH',
      url: `/api/v1/checkins/${checkinId}/topics`,
      headers: AUTH,
      payload: { topics: ['Integral definida', 'Teorema Fundamental'] },
    });
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/checkins/${checkinId}/comprehension`,
      headers: AUTH,
      payload: { comprehension_level: 2, difficulties: 'Teorema Fundamental' },
    });

    const completeRes = await app.inject({
      method: 'POST',
      url: `/api/v1/checkins/${checkinId}/complete`,
      headers: AUTH,
    });
    expect(completeRes.statusCode).toBe(200);
    const body = completeRes.json<{
      checkin: { status: string };
      reinforce: { name: string }[];
    }>();
    expect(body.checkin.status).toBe('completed');
    expect(body.reinforce.some((item) => item.name === 'Teorema Fundamental')).toBe(true);
  });

  it('retorna 404 al completar un check-in ajeno', async () => {
    testStore.seed('checkins', [
      {
        id: '00000000-0000-4000-8000-0000000000c9',
        student_id: 'user-b',
        course_id: FOREIGN_COURSE_ID,
        class_date: '2026-08-15',
        status: 'in_progress',
        comprehension_level: 3,
      },
    ]);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/checkins/00000000-0000-4000-8000-0000000000c9/complete',
      headers: AUTH,
    });
    expect(res.statusCode).toBe(404);
  });
});
