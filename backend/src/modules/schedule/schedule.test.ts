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
const FOREIGN_COURSE_ID = '00000000-0000-4000-8000-0000000000f9';
const CLASSROOM_ID = '00000000-0000-4000-8000-0000000000c1';
const SCHEDULE_ID = '00000000-0000-4000-8000-000000000091';
const FOREIGN_SCHEDULE_ID = '00000000-0000-4000-8000-000000000099';

/** Lunes usado como referencia de la vista semanal */
const MONDAY = '2026-08-17';

function timeAt(offsetMinutes: number, from: Date): string {
  const date = new Date(from.getTime() + offsetMinutes * 60_000);
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}:00`;
}

describe('módulo schedule', () => {
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
      {
        id: COURSE_ID,
        student_id: 'user-a',
        name: 'Cálculo II',
        academic_period_id: '00000000-0000-4000-8000-0000000000d1',
        modality: 'in_person',
        color: '#4f46e5',
      },
      {
        id: FOREIGN_COURSE_ID,
        student_id: 'user-b',
        name: 'Curso ajeno',
        academic_period_id: '00000000-0000-4000-8000-0000000000d9',
        modality: 'in_person',
        color: null,
      },
    ]);
    testStore.seed('classrooms', [
      {
        id: CLASSROOM_ID,
        student_id: 'user-a',
        name: 'Aula 201',
        location: 'Edificio B',
        virtual_url: null,
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

  it('retorna 401 sin token en las rutas del módulo', async () => {
    for (const [method, url] of [
      ['GET', '/api/v1/schedules'],
      ['POST', '/api/v1/schedules'],
      ['GET', '/api/v1/schedules/upcoming'],
    ] as const) {
      const res = await app.inject({ method, url });
      expect(res.statusCode, `${method} ${url}`).toBe(401);
    }
  });

  it('crea un bloque de horario con student_id del JWT (RF-037)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/schedules',
      headers: AUTH,
      payload: {
        course_id: COURSE_ID,
        classroom_id: CLASSROOM_ID,
        day_of_week: 1,
        start_time: '08:00',
        end_time: '10:00',
        student_id: 'user-victima',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json<{
      start_time: string;
      course: { name: string } | null;
      classroom: { name: string } | null;
    }>();
    expect(body.start_time).toBe('08:00:00');
    expect(body.course?.name).toBe('Cálculo II');
    expect(body.classroom?.name).toBe('Aula 201');
    expect(testStore.rows('schedules')[0]?.student_id).toBe('user-a');
  });

  it('rechaza end_time anterior o igual a start_time con 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/schedules',
      headers: AUTH,
      payload: { course_id: COURSE_ID, day_of_week: 1, start_time: '10:00', end_time: '09:00' },
    });

    expect(res.statusCode).toBe(400);
    expect(testStore.rows('schedules')).toHaveLength(0);
  });

  it('rechaza day_of_week fuera de 0-6 con 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/schedules',
      headers: AUTH,
      payload: { course_id: COURSE_ID, day_of_week: 7, start_time: '08:00', end_time: '10:00' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('retorna 404 (nunca 403) al usar un curso ajeno', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/schedules',
      headers: AUTH,
      payload: {
        course_id: FOREIGN_COURSE_ID,
        day_of_week: 2,
        start_time: '08:00',
        end_time: '10:00',
      },
    });

    expect(res.statusCode).toBe(404);
    expect(testStore.rows('schedules')).toHaveLength(0);
  });

  it('lista solo horarios propios y los actualiza y elimina (RF-038)', async () => {
    testStore.seed('schedules', [
      {
        id: SCHEDULE_ID,
        student_id: 'user-a',
        course_id: COURSE_ID,
        classroom_id: null,
        day_of_week: 3,
        start_time: '13:00:00',
        end_time: '15:00:00',
        recurrence: 'weekly',
        valid_from: null,
        valid_until: null,
      },
      {
        id: FOREIGN_SCHEDULE_ID,
        student_id: 'user-b',
        course_id: FOREIGN_COURSE_ID,
        classroom_id: null,
        day_of_week: 3,
        start_time: '13:00:00',
        end_time: '15:00:00',
        recurrence: 'weekly',
        valid_from: null,
        valid_until: null,
      },
    ]);

    const listRes = await app.inject({ method: 'GET', url: '/api/v1/schedules', headers: AUTH });
    expect(listRes.statusCode).toBe(200);
    const schedules = listRes.json<{ schedules: { id: string }[] }>().schedules;
    expect(schedules).toHaveLength(1);
    expect(schedules[0]?.id).toBe(SCHEDULE_ID);

    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/schedules/${SCHEDULE_ID}`,
      headers: AUTH,
      payload: { start_time: '14:00', end_time: '16:00' },
    });
    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.json<{ start_time: string }>().start_time).toBe('14:00:00');

    const foreignRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/schedules/${FOREIGN_SCHEDULE_ID}`,
      headers: AUTH,
      payload: { start_time: '07:00' },
    });
    expect(foreignRes.statusCode).toBe(404);

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/schedules/${SCHEDULE_ID}`,
      headers: AUTH,
    });
    expect(deleteRes.statusCode).toBe(204);
    expect(testStore.rows('schedules')).toHaveLength(1);
  });

  it('expande la semana solicitada respetando la vigencia (RF-039)', async () => {
    testStore.seed('schedules', [
      {
        id: SCHEDULE_ID,
        student_id: 'user-a',
        course_id: COURSE_ID,
        classroom_id: CLASSROOM_ID,
        day_of_week: 1,
        start_time: '08:00:00',
        end_time: '10:00:00',
        recurrence: 'weekly',
        valid_from: null,
        valid_until: null,
      },
      {
        id: '00000000-0000-4000-8000-000000000092',
        student_id: 'user-a',
        course_id: COURSE_ID,
        classroom_id: null,
        day_of_week: 2,
        start_time: '08:00:00',
        end_time: '10:00:00',
        recurrence: 'weekly',
        valid_from: null,
        // Vigencia terminada antes de la semana consultada
        valid_until: '2026-01-31',
      },
    ]);

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/schedules?week=${MONDAY}`,
      headers: AUTH,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{
      week_start: string;
      week_end: string;
      schedules: { id: string; date: string }[];
    }>();
    expect(body.week_start).toBe(MONDAY);
    expect(body.week_end).toBe('2026-08-23');
    expect(body.schedules).toHaveLength(1);
    expect(body.schedules[0]?.id).toBe(SCHEDULE_ID);
    expect(body.schedules[0]?.date).toBe(MONDAY);
  });

  it('detecta las clases que terminan en los próximos 30 minutos (RF-041)', async () => {
    const now = new Date();
    const endingSoon = new Date(now.getTime() + 15 * 60_000);

    testStore.seed('schedules', [
      {
        id: SCHEDULE_ID,
        student_id: 'user-a',
        course_id: COURSE_ID,
        classroom_id: null,
        day_of_week: endingSoon.getDay(),
        start_time: timeAt(-45, now),
        end_time: timeAt(15, now),
        recurrence: 'weekly',
        valid_from: null,
        valid_until: null,
      },
      {
        id: '00000000-0000-4000-8000-000000000093',
        student_id: 'user-a',
        course_id: COURSE_ID,
        classroom_id: null,
        day_of_week: endingSoon.getDay(),
        start_time: timeAt(60, now),
        end_time: timeAt(120, now),
        recurrence: 'weekly',
        valid_from: null,
        valid_until: null,
      },
    ]);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/schedules/upcoming',
      headers: AUTH,
    });

    expect(res.statusCode).toBe(200);
    const upcoming = res.json<{
      upcoming: { id: string; ends_in_minutes: number; in_session: boolean }[];
    }>().upcoming;
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0]?.id).toBe(SCHEDULE_ID);
    expect(upcoming[0]?.ends_in_minutes).toBeLessThanOrEqual(15);
    expect(upcoming[0]?.in_session).toBe(true);
  });
});
