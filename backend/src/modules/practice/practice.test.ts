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
const COURSE_ID = '00000000-0000-4000-8000-0000000000f1';
const CONCEPT_ID = '00000000-0000-4000-8000-0000000000a1';

describe('módulo practice', () => {
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
    testStore.seed('courses', [
      { id: COURSE_ID, student_id: 'user-a', name: 'Cálculo I', modality: 'in_person' },
    ]);
    testStore.seed('concepts', [
      { id: CONCEPT_ID, student_id: 'user-a', name: 'Integral definida', course_id: COURSE_ID },
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

  it('no expone la solución al obtener una práctica antes de responder', async () => {
    const generateRes = await app.inject({
      method: 'POST',
      url: '/api/v1/practice/generate',
      headers: AUTH,
      payload: { course_id: COURSE_ID, concept_id: CONCEPT_ID, exercise_count: 2 },
    });
    expect(generateRes.statusCode).toBe(201);
    const generated = generateRes.json<{
      practice: { id: string };
      exercises: { solution?: string; correct_answer?: string }[];
    }>();
    expect(generated.exercises[0]).not.toHaveProperty('solution');
    expect(generated.exercises[0]).not.toHaveProperty('correct_answer');

    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/practice/${generated.practice.id}`,
      headers: AUTH,
    });
    expect(getRes.statusCode).toBe(200);
    const detail = getRes.json<{ exercises: { solution?: string; correct_answer?: string }[] }>();
    expect(detail.exercises[0]).not.toHaveProperty('solution');
    expect(detail.exercises[0]).not.toHaveProperty('correct_answer');
  });

  it('genera práctica solo con el curso y permite generar otra vez', async () => {
    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/practice/generate',
      headers: AUTH,
      payload: { course_id: COURSE_ID, exercise_count: 3 },
    });
    expect(first.statusCode).toBe(201);
    const firstBody = first.json<{
      practice: { id: string; title: string };
      exercises: { statement: string }[];
    }>();
    expect(firstBody.exercises.length).toBe(3);
    expect(firstBody.practice.title).toContain('Cálculo I');

    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/practice/generate',
      headers: AUTH,
      payload: { course_id: COURSE_ID, exercise_count: 3 },
    });
    expect(second.statusCode).toBe(201);
    expect(second.json<{ exercises: unknown[] }>().exercises.length).toBe(3);

    const list = await app.inject({
      method: 'GET',
      url: `/api/v1/practice?course_id=${COURSE_ID}`,
      headers: AUTH,
    });
    expect(list.statusCode).toBe(200);
    expect(list.json<{ practices: unknown[] }>().practices.length).toBe(2);
  });
});
