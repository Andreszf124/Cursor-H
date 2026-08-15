import { z } from 'zod';

export const RESOURCE_TYPES = ['video', 'article', 'course', 'book', 'exercise', 'other'] as const;

export const searchResourcesSchema = z.object({
  q: z.string().trim().min(1).max(200),
  source_type: z.enum(RESOURCE_TYPES).optional(),
  language: z.string().trim().min(2).max(10).optional(),
});

export const saveResourceSchema = z.object({
  concept_id: z.uuid().optional().nullable(),
  note: z.string().trim().max(1000).optional().nullable(),
});

export const uuidParamSchema = z.object({ id: z.uuid() });
