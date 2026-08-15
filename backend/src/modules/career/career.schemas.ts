import { z } from 'zod';

export const createInstitutionSchema = z.object({
  name: z.string().trim().min(2).max(200),
  country: z.string().trim().min(2).max(100).optional(),
});

export const listCareersQuerySchema = z.object({
  institution_id: z.uuid(),
});

export const setupCareerSchema = z.object({
  institution_id: z.uuid(),
  career_name: z.string().trim().min(2).max(200),
  degree_level: z.enum([
    'tecnico',
    'diplomado',
    'licenciatura',
    'maestria',
    'doctorado',
    'otro',
  ]),
  started_at: z.string().date().optional(),
  expected_graduation: z.string().date().optional(),
});

export const createPeriodSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    start_date: z.string().date(),
    end_date: z.string().date(),
    activate: z.boolean().optional().default(false),
  })
  .refine((value) => value.end_date >= value.start_date, {
    message: 'end_date debe ser >= start_date',
    path: ['end_date'],
  });

export const subjectStatusSchema = z.object({
  status: z.enum(['approved', 'failed', 'in_progress', 'pending']),
  grade: z.string().trim().max(20).optional().nullable(),
  completed_at: z.string().date().optional().nullable(),
  academic_period_id: z.uuid().optional().nullable(),
});

export const uuidParamSchema = z.object({
  id: z.uuid(),
});
