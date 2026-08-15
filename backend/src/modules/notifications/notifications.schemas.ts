import { z } from 'zod';

export const NOTIFICATION_TYPES = [
  'class_reminder',
  'checkin_reminder',
  'activity_reminder',
  'review_reminder',
  'assessment_reminder',
  'system',
] as const;

export const listNotificationsSchema = z.object({
  unread: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  type: z.enum(NOTIFICATION_TYPES).optional(),
});

export const updatePreferencesSchema = z
  .object({
    class_reminders: z.boolean().optional(),
    checkin_reminders: z.boolean().optional(),
    activity_reminders: z.boolean().optional(),
    quiet_hours_start: z
      .string()
      .regex(/^\d{2}:\d{2}(:\d{2})?$/)
      .nullable()
      .optional(),
    quiet_hours_end: z
      .string()
      .regex(/^\d{2}:\d{2}(:\d{2})?$/)
      .nullable()
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nada que actualizar' });

export const uuidParamSchema = z.object({ id: z.uuid() });
