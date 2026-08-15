import { z } from 'zod';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const createProfessorSchema = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.email().max(255).nullable().optional(),
});

export const updateProfessorSchema = createProfessorSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Se requiere al menos un campo',
  });

export const createClassroomSchema = z.object({
  name: z.string().trim().min(1).max(200),
  location: z.string().trim().max(300).nullable().optional(),
  virtual_url: z.url().max(2000).nullable().optional(),
});

export const updateClassroomSchema = createClassroomSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Se requiere al menos un campo',
  });

export const createCourseSchema = z.object({
  name: z.string().trim().min(1).max(200),
  academic_period_id: z.uuid(),
  subject_id: z.uuid().nullable().optional(),
  professor_id: z.uuid().nullable().optional(),
  modality: z.enum(['in_person', 'virtual', 'hybrid']).default('in_person'),
  color: z.string().regex(HEX_COLOR, 'Debe ser un color hexadecimal #RRGGBB').nullable().optional(),
});

export const updateCourseSchema = createCourseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Se requiere al menos un campo',
  });

export const listCoursesQuerySchema = z.object({
  academic_period_id: z.uuid().optional(),
});

export const createScheduleSchema = z.object({
  course_id: z.uuid(),
  classroom_id: z.uuid().optional().nullable(),
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  recurrence: z.string().default('weekly'),
  valid_from: z.string().date().optional().nullable(),
  valid_until: z.string().date().optional().nullable(),
});

export const updateScheduleSchema = z.object({
  classroom_id: z.uuid().optional().nullable(),
  day_of_week: z.number().int().min(0).max(6).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  recurrence: z.string().optional(),
  valid_from: z.string().date().optional().nullable(),
  valid_until: z.string().date().optional().nullable(),
});

export const uuidParamSchema = z.object({
  id: z.uuid(),
});
