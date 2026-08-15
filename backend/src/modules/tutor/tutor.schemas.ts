import { z } from 'zod';

/** RF-102–105: variantes de respuesta que el estudiante puede pedir */
export const TUTOR_MODES = ['explain', 'rephrase', 'example', 'analogy', 'error'] as const;

export const createConversationSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  course_id: z.uuid().optional().nullable(),
  concept_id: z.uuid().optional().nullable(),
});

export const chatSchema = z.object({
  conversation_id: z.uuid().optional(),
  message: z.string().trim().min(1).max(4000),
  mode: z.enum(TUTOR_MODES).default('explain'),
  course_id: z.uuid().optional().nullable(),
});

export const uuidParamSchema = z.object({ id: z.uuid() });
