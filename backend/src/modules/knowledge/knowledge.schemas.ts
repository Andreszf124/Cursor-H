import { z } from 'zod';

export const GAP_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;

export const createConceptSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  subject_id: z.uuid().optional().nullable(),
  course_id: z.uuid().optional().nullable(),
  source: z.enum(['checkin', 'material', 'transcript', 'manual']).default('manual'),
});

export const listConceptsSchema = z.object({
  course_id: z.uuid().optional(),
  subject_id: z.uuid().optional(),
});

export const createGapSchema = z.object({
  concept_id: z.uuid(),
  course_id: z.uuid().optional().nullable(),
  severity: z.enum(GAP_SEVERITIES).optional(),
  prerequisite_missing: z.boolean().default(false),
  next_assessment_date: z.string().date().optional().nullable(),
  detected_from: z.enum(['assessment', 'checkin', 'practice', 'manual']).default('manual'),
});

export const updateGapSchema = z
  .object({
    status: z.enum(['active', 'improving', 'closed']).optional(),
    severity: z.enum(GAP_SEVERITIES).optional(),
    next_assessment_date: z.string().date().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nada que actualizar' });

export const recordMasterySchema = z.object({
  concept_id: z.uuid(),
  score: z.number().min(0).max(1),
  source: z.enum(['assessment', 'practice', 'checkin', 'manual']).default('manual'),
  source_id: z.uuid().optional().nullable(),
});

export const uuidParamSchema = z.object({ id: z.uuid() });
