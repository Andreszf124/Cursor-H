import { z } from 'zod';

export const registerVideoSchema = z.object({
  title: z.string().trim().min(1).max(200),
  material_id: z.uuid().optional().nullable(),
  /** Si llega la transcripción, se procesa en el momento; si no, queda pendiente */
  transcript_text: z.string().trim().max(200_000).optional(),
  language: z.string().trim().min(2).max(10).default('es'),
  duration_seconds: z.number().int().min(0).max(86_400).optional(),
  source: z.enum(['upload', 'teams', 'manual']).default('upload'),
});

export const askSchema = z.object({
  question: z.string().trim().min(1).max(2000),
});

export const timestampQuerySchema = z.object({
  concept: z.string().trim().min(1).max(200),
});

export const courseParamSchema = z.object({ courseId: z.uuid() });
export const uuidParamSchema = z.object({ id: z.uuid() });
