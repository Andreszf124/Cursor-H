import { z } from 'zod';

export const byConceptQuerySchema = z.object({
  course_id: z.uuid().optional(),
});
