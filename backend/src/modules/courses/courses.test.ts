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
const FOREIGN_PERIOD_ID = '00000000-0000-4000-8000-0000000000d9';
const COURSE_ID = '00000000-0000-4000-8000-0000000000f1';
const FOREIGN_COURSE_ID = '00000000-0000-4000-8000-0000000000f9';
const PROFESSOR_ID = '00000000-0000-4000-8000-0000000000b1';

describe('módulo courses', () => {
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
      { id: FOREIGN_PERIOD_ID, student_id: 'user-b', name: '2026-I', is_active: true },
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

  it('retorna 401 sin token en las rutas del módulo', async () => {
    for (const [method, url] of [
      ['GET', '/api/v1/courses'],
      ['POST', '/api/v1/courses'],
      ['GET', '/api/v1/professors'],
      ['POST', '/api/v1/professors'],
      ['GET', '/api/v1/classrooms'],
      ['POST', '/api/v1/classrooms'],
    ] as const) {
      const res = await app.inject({ method, url });
      expect(res.statusCode, `${method} ${url}`).toBe(401);
    }
  });

  it('retorna 401 con token inválido', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/courses',
      headers: { authorization: 'Bearer token-falso' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('crea un curso con student_id del JWT e ignora el del body (RF-031)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: AUTH,
      payload: {
        name: 'Cálculo II',
        academic_period_id: PERIOD_ID,
        modality: 'hybrid',
        color: '#4f46e5',
        student_id: 'user-victima',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json<{ name: string; modality: string }>().modality).toBe('hybrid');

    const stored = testStore.rows('courses')[0];
    expect(stored?.student_id).toBe('user-a');
    expect(stored).not.toHaveProperty('student_id', 'user-victima');
  });

  it('rechaza una modalidad fuera del enum con 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: AUTH,
      payload: { name: 'Cálculo II', academic_period_id: PERIOD_ID, modality: 'presencial' },
    });

    expect(res.statusCode).toBe(400);
    expect(testStore.rows('courses')).toHaveLength(0);
  });

  it('retorna 404 (nunca 403) si el período académico no es del estudiante', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: AUTH,
      payload: { name: 'Curso ajeno', academic_period_id: FOREIGN_PERIOD_ID },
    });

    expect(res.statusCode).toBe(404);
    expect(testStore.rows('courses')).toHaveLength(0);
  });

  it('lista solo los cursos propios (RF-032)', async () => {
    testStore.seed('courses', [
      {
        id: COURSE_ID,
        student_id: 'user-a',
        name: 'Física I',
        academic_period_id: PERIOD_ID,
        modality: 'in_person',
      },
      {
        id: FOREIGN_COURSE_ID,
        student_id: 'user-b',
        name: 'Curso ajeno',
        academic_period_id: FOREIGN_PERIOD_ID,
        modality: 'in_person',
      },
    ]);

    const res = await app.inject({ method: 'GET', url: '/api/v1/courses', headers: AUTH });

    expect(res.statusCode).toBe(200);
    const courses = res.json<{ courses: { id: string }[] }>().courses;
    expect(courses).toHaveLength(1);
    expect(courses[0]?.id).toBe(COURSE_ID);
  });

  it('incluye el profesor propio al listar y al obtener un curso', async () => {
    testStore.seed('professors', [
      { id: PROFESSOR_ID, student_id: 'user-a', name: 'Carlos Rodríguez', email: null },
    ]);
    testStore.seed('courses', [
      {
        id: COURSE_ID,
        student_id: 'user-a',
        name: 'Cálculo I',
        academic_period_id: PERIOD_ID,
        professor_id: PROFESSOR_ID,
        modality: 'in_person',
      },
    ]);

    const listRes = await app.inject({ method: 'GET', url: '/api/v1/courses', headers: AUTH });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json<{ courses: { professor: { name: string } | null }[] }>().courses[0]?.professor?.name).toBe(
      'Carlos Rodríguez',
    );

    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/courses/${COURSE_ID}`,
      headers: AUTH,
    });
    expect(getRes.statusCode).toBe(200);
    expect(getRes.json<{ professor: { name: string } | null }>().professor?.name).toBe('Carlos Rodríguez');
  });

  it('actualiza y elimina un curso propio (RF-033, RF-035)', async () => {
    testStore.seed('courses', [
      {
        id: COURSE_ID,
        student_id: 'user-a',
        name: 'Física I',
        academic_period_id: PERIOD_ID,
        modality: 'in_person',
        color: null,
      },
    ]);

    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/courses/${COURSE_ID}`,
      headers: AUTH,
      payload: { name: 'Física General', color: '#0ea5e9' },
    });
    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.json<{ name: string }>().name).toBe('Física General');

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/courses/${COURSE_ID}`,
      headers: AUTH,
    });
    expect(deleteRes.statusCode).toBe(204);
    expect(testStore.rows('courses')).toHaveLength(0);
  });

  it('retorna 404 al operar sobre un curso ajeno', async () => {
    testStore.seed('courses', [
      {
        id: FOREIGN_COURSE_ID,
        student_id: 'user-b',
        name: 'Curso ajeno',
        academic_period_id: FOREIGN_PERIOD_ID,
        modality: 'in_person',
      },
    ]);

    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/courses/${FOREIGN_COURSE_ID}`,
      headers: AUTH,
    });
    expect(getRes.statusCode).toBe(404);

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/courses/${FOREIGN_COURSE_ID}`,
      headers: AUTH,
    });
    expect(deleteRes.statusCode).toBe(404);
    expect(testStore.rows('courses')).toHaveLength(1);
  });

  it('gestiona profesores del estudiante (RF-034)', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/professors',
      headers: AUTH,
      payload: { name: 'Ana Mora', email: 'ana@universidad.edu' },
    });
    expect(createRes.statusCode).toBe(201);
    const professorId = createRes.json<{ id: string }>().id;
    expect(testStore.rows('professors')[0]?.student_id).toBe('user-a');

    const listRes = await app.inject({ method: 'GET', url: '/api/v1/professors', headers: AUTH });
    expect(listRes.json<{ professors: unknown[] }>().professors).toHaveLength(1);

    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/professors/${professorId}`,
      headers: AUTH,
      payload: { name: 'Ana M. Mora' },
    });
    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.json<{ name: string }>().name).toBe('Ana M. Mora');

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/professors/${professorId}`,
      headers: AUTH,
    });
    expect(deleteRes.statusCode).toBe(204);
  });

  it('rechaza un email de profesor inválido con 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/professors',
      headers: AUTH,
      payload: { name: 'Ana Mora', email: 'no-es-email' },
    });
    expect(res.statusCode).toBe(400);
    expect(testStore.rows('professors')).toHaveLength(0);
  });

  it('gestiona aulas físicas y virtuales (RF-036)', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/classrooms',
      headers: AUTH,
      payload: { name: 'Aula 201', location: 'Edificio B', virtual_url: 'https://meet.test/abc' },
    });
    expect(createRes.statusCode).toBe(201);
    expect(testStore.rows('classrooms')[0]?.student_id).toBe('user-a');

    const listRes = await app.inject({ method: 'GET', url: '/api/v1/classrooms', headers: AUTH });
    expect(listRes.json<{ classrooms: { name: string }[] }>().classrooms[0]?.name).toBe('Aula 201');
  });

  it('retorna 404 al asignar un profesor ajeno a un curso', async () => {
    testStore.seed('professors', [
      { id: PROFESSOR_ID, student_id: 'user-b', name: 'Profesor ajeno', email: null },
    ]);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: AUTH,
      payload: {
        name: 'Cálculo II',
        academic_period_id: PERIOD_ID,
        professor_id: PROFESSOR_ID,
      },
    });

    expect(res.statusCode).toBe(404);
    expect(testStore.rows('courses')).toHaveLength(0);
  });
});
