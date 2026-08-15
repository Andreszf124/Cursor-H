import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

const state = vi.hoisted(() => ({
  institutions: [] as Record<string, unknown>[],
  careers: [] as Record<string, unknown>[],
  periods: [] as Record<string, unknown>[],
  subjects: [] as Record<string, unknown>[],
  statuses: [] as Record<string, unknown>[],
}));

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
}));

vi.mock('../../infrastructure/database/supabase.client.js', () => ({
  getAnonClient: () => ({ auth: { getUser: mocks.getUser } }),
  getServiceClient: () => ({}),
  createUserClient: () => ({
    from: (table: string) => {
      if (table === 'institutions') {
        return {
          select: () => ({
            order: () => ({
              then: (resolve: (v: unknown) => unknown) =>
                Promise.resolve(resolve({ data: state.institutions, error: null })),
              ilike: () =>
                Promise.resolve({ data: state.institutions, error: null }),
            }),
            eq: () => ({
              maybeSingle: async () => ({
                data: state.institutions[0] ?? null,
                error: null,
              }),
            }),
          }),
          insert: (payload: Record<string, unknown>) => {
            const row = {
              id: 'inst-1',
              is_verified: false,
              name: String(payload.name ?? ''),
              country: (payload.country as string | null) ?? null,
              created_by: payload.created_by,
            };
            state.institutions.push(row);
            return {
              select: () => ({
                single: async () => ({
                  data: {
                    id: row.id,
                    name: row.name,
                    country: row.country,
                    is_verified: false,
                  },
                  error: null,
                }),
              }),
            };
          },
        };
      }

      if (table === 'careers') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: state.careers[0] ?? null, error: null }),
                }),
                order: async () => ({ data: state.careers, error: null }),
              }),
              order: async () => ({ data: state.careers, error: null }),
            }),
          }),
          insert: (payload: Record<string, unknown>) => {
            const row = { id: 'career-1', ...payload };
            state.careers.push(row);
            return {
              select: () => ({
                single: async () => ({ data: { id: row.id }, error: null }),
              }),
            };
          },
        };
      }

      if (table === 'student_careers') {
        return {
          update: () => ({
            eq: () => ({
              eq: async () => ({ error: null }),
            }),
          }),
          upsert: () => ({
            select: () => ({
              single: async () => ({
                data: {
                  id: 'sc-1',
                  is_active: true,
                  started_at: null,
                  expected_graduation: null,
                  career: {
                    id: 'career-1',
                    institution_id: '00000000-0000-4000-8000-000000000001',
                    name: 'Ing. Sistemas',
                    degree_level: 'licenciatura',
                    total_credits: null,
                    institution: {
                      id: '00000000-0000-4000-8000-000000000001',
                      name: 'UCR',
                      country: 'CR',
                      is_verified: false,
                    },
                  },
                },
                error: null,
              }),
            }),
          }),
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        };
      }

      if (table === 'academic_periods') {
        return {
          insert: (payload: Record<string, unknown>) => {
            const row = {
              id: 'period-1',
              name: String(payload.name ?? ''),
              start_date: String(payload.start_date ?? ''),
              end_date: String(payload.end_date ?? ''),
              is_active: Boolean(payload.is_active ?? false),
              student_id: payload.student_id,
            };
            state.periods.push(row);
            return {
              select: () => ({
                single: async () => ({
                  data: {
                    id: row.id,
                    name: row.name,
                    start_date: row.start_date,
                    end_date: row.end_date,
                    is_active: row.is_active,
                  },
                  error: null,
                }),
              }),
            };
          },
          select: () => ({
            eq: (col: string) => {
              if (col === 'id') {
                return {
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: state.periods[0] ?? { id: 'period-1' },
                      error: null,
                    }),
                  }),
                };
              }
              return {
                order: async () => ({
                  data: state.periods.map((p) => ({
                    id: String(p.id),
                    name: String(p.name),
                    start_date: String(p.start_date),
                    end_date: String(p.end_date),
                    is_active: Boolean(p.is_active),
                  })),
                  error: null,
                }),
              };
            },
          }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => ({
                  single: async () => ({
                    data: {
                      id: 'period-1',
                      name: '2026-I',
                      start_date: '2026-01-01',
                      end_date: '2026-06-30',
                      is_active: true,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }

      if (table === 'subjects') {
        return {
          select: () => ({
            eq: (col: string) => {
              if (col === 'id') {
                return {
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: state.subjects[0] ?? null,
                      error: null,
                    }),
                  }),
                };
              }
              return {
                order: async () => ({ data: state.subjects, error: null }),
              };
            },
          }),
        };
      }

      if (table === 'student_subject_status') {
        return {
          select: () => ({
            eq: async () => ({ data: state.statuses, error: null }),
          }),
          upsert: (payload: Record<string, unknown>) => {
            state.statuses.push(payload);
            return {
              select: () => ({
                single: async () => ({
                  data: {
                    subject_id: payload.subject_id,
                    status: payload.status,
                    grade: payload.grade ?? null,
                    completed_at: payload.completed_at ?? null,
                    academic_period_id: payload.academic_period_id ?? null,
                  },
                  error: null,
                }),
              }),
            };
          },
        };
      }

      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      };
    },
  }),
}));

import { buildApp } from '../../app.js';

const AUTH = { authorization: 'Bearer valid-token-a' };
const INST_ID = '00000000-0000-4000-8000-000000000001';
const PERIOD_ID = '00000000-0000-4000-8000-000000000010';
const SUBJECT_ID = '00000000-0000-4000-8000-000000000099';

describe('módulo career', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    state.institutions = [];
    state.careers = [];
    state.periods = [];
    state.subjects = [
      { id: 'subj-1', code: 'MAT-101', name: 'Cálculo I', credits: 4 },
      { id: 'subj-2', code: 'FIS-101', name: 'Física I', credits: 3 },
    ];
    state.statuses = [
      {
        subject_id: 'subj-1',
        status: 'approved',
        grade: '90',
        completed_at: '2025-12-01',
      },
    ];
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
    const res = await app.inject({ method: 'GET', url: '/api/v1/institutions' });
    expect(res.statusCode).toBe(401);
  });

  it('crea institución custom con created_by del JWT (RF-012)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/institutions',
      headers: AUTH,
      payload: { name: 'UCR', country: 'CR' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json<{ name: string }>().name).toBe('UCR');
    expect(state.institutions[0]?.created_by).toBe('user-a');
  });

  it('configura carrera (RF-013/014)', async () => {
    state.institutions = [{ id: INST_ID, name: 'UCR' }];
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/career/setup',
      headers: AUTH,
      payload: {
        institution_id: INST_ID,
        career_name: 'Ing. Sistemas',
        degree_level: 'licenciatura',
        student_id: 'user-victima',
      },
    });
    expect(res.statusCode).toBe(201);
  });

  it('crea período académico (RF-015)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/academic-periods',
      headers: AUTH,
      payload: {
        name: '2026-I',
        start_date: '2026-01-01',
        end_date: '2026-06-30',
        activate: true,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json<{ name: string }>().name).toBe('2026-I');
  });

  it('activa período (RF-016)', async () => {
    state.periods = [
      {
        id: PERIOD_ID,
        name: '2026-I',
        start_date: '2026-01-01',
        end_date: '2026-06-30',
        is_active: false,
      },
    ];
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/academic-periods/${PERIOD_ID}/activate`,
      headers: AUTH,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ is_active: boolean }>().is_active).toBe(true);
  });

  it('calcula progreso académico (RF-020)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/academic-progress',
      headers: AUTH,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{
      total_subjects: number;
      approved: number;
      pending: number;
      earned_credits: number;
    }>();
    expect(body.total_subjects).toBe(2);
    expect(body.approved).toBe(1);
    expect(body.pending).toBe(1);
    expect(body.earned_credits).toBe(4);
  });

  it('retorna 404 al actualizar estado de materia inexistente', async () => {
    state.subjects = [];
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/subjects/${SUBJECT_ID}/status`,
      headers: AUTH,
      payload: { status: 'approved' },
    });
    expect(res.statusCode).toBe(404);
  });
});
