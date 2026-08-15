import { z } from 'zod';

/**
 * Los objetos Zod eliminan claves desconocidas por defecto (strip):
 * cualquier `id` o `student_id` enviado en el body se descarta —
 * la identidad SIEMPRE proviene del JWT verificado (SECURITY.md R1).
 */

export const learningPreferencesSchema = z.object({
  learning_style: z.enum(['visual', 'auditory', 'kinesthetic', 'mixed']).optional(),
  session_duration_minutes: z.number().int().min(10).max(240).optional(),
  difficulty_preference: z.enum(['adaptive', 'easy', 'challenging']).optional(),
  techniques: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  preferred_study_hours: z.record(z.string(), z.array(z.string().max(20)).max(10)).optional(),
});

export const updatePreferencesSchema = learningPreferencesSchema.refine(
  (value) => Object.keys(value).length > 0,
  { message: 'Debe incluir al menos un campo para actualizar' },
);

export const updateProfileSchema = z
  .object({
    full_name: z.string().trim().min(1).max(120).optional(),
    language: z.enum(['es', 'en']).optional(),
    timezone: z.string().trim().min(1).max(60).optional(),
    learning_preferences: learningPreferencesSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Debe incluir al menos un campo para actualizar',
  });
