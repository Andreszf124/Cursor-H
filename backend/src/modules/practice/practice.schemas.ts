import { z } from 'zod';

export const generatePracticeSchema = z.object({
  /** Si no se envía, se toma la brecha activa de mayor prioridad (RF-117) */
  gap_id: z.uuid().optional(),
  concept_id: z.uuid().optional(),
  course_id: z.uuid().optional().nullable(),
  topics: z.array(z.string().trim().min(1).max(200)).max(10).optional(),
  exercise_count: z.number().int().min(1).max(10).default(3),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
});

export const listPracticesSchema = z.object({
  course_id: z.uuid().optional(),
});

export const submitExerciseSchema = z.object({
  answer: z.string().trim().min(1).max(4000),
  time_spent_seconds: z.number().int().min(0).max(86_400).default(0),
});

export const uuidParamSchema = z.object({ id: z.uuid() });
