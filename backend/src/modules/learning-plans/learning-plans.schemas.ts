import { z } from 'zod';

export const generatePlanSchema = z.object({
  course_id: z.uuid().optional().nullable(),
  /** RF-109 — tiempo real disponible del estudiante */
  available_minutes: z.number().int().min(10).max(600).default(60),
  next_class_at: z.iso.datetime().optional().nullable(),
  title: z.string().trim().min(1).max(200).optional(),
});

export const uuidParamSchema = z.object({ id: z.uuid() });
