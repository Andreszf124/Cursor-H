import { z } from 'zod';

export const createCheckinSchema = z.object({
  course_id: z.uuid(),
  schedule_id: z.uuid().optional().nullable(),
  class_date: z.string().date().optional(),
});

export const listCheckinsSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped']).optional(),
  course_id: z.uuid().optional(),
});

export const recordTopicsSchema = z.object({
  topics: z.array(z.string().trim().min(1).max(200)).min(1).max(20),
  /** 'suggested' cuando el estudiante acepta los temas propuestos (RF-086) */
  origin: z.enum(['student', 'suggested']).default('student'),
});

export const comprehensionSchema = z.object({
  comprehension_level: z.number().int().min(1).max(5),
  difficulties: z.string().trim().max(2000).optional().nullable(),
});

export const generateDiagnosticSchema = z.object({
  question_count: z.number().int().min(1).max(10).default(3),
});

export const submitDiagnosticSchema = z.object({
  responses: z
    .array(
      z.object({
        question_id: z.uuid(),
        answer: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(20),
});

export const uuidParamSchema = z.object({ id: z.uuid() });
