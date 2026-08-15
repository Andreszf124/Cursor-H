import { z } from 'zod';

/** HH:MM o HH:MM:SS en 24h */
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const timeField = z.string().trim().regex(TIME_PATTERN, 'Formato de hora inválido (HH:MM)');

function toMinutes(time: string): number {
  const [hours = '0', minutes = '0'] = time.split(':');
  return Number.parseInt(hours, 10) * 60 + Number.parseInt(minutes, 10);
}

export const createScheduleSchema = z
  .object({
    course_id: z.uuid(),
    classroom_id: z.uuid().nullable().optional(),
    day_of_week: z.number().int().min(0).max(6),
    start_time: timeField,
    end_time: timeField,
    recurrence: z.enum(['weekly', 'biweekly', 'once']).default('weekly'),
    valid_from: z.string().date().nullable().optional(),
    valid_until: z.string().date().nullable().optional(),
  })
  .refine((value) => toMinutes(value.end_time) > toMinutes(value.start_time), {
    message: 'end_time debe ser posterior a start_time',
    path: ['end_time'],
  })
  .refine(
    (value) =>
      !value.valid_from || !value.valid_until || value.valid_until >= value.valid_from,
    { message: 'valid_until debe ser >= valid_from', path: ['valid_until'] },
  );

export const updateScheduleSchema = z
  .object({
    classroom_id: z.uuid().nullable().optional(),
    day_of_week: z.number().int().min(0).max(6).optional(),
    start_time: timeField.optional(),
    end_time: timeField.optional(),
    recurrence: z.enum(['weekly', 'biweekly', 'once']).optional(),
    valid_from: z.string().date().nullable().optional(),
    valid_until: z.string().date().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Se requiere al menos un campo',
  })
  .refine(
    (value) =>
      !value.start_time ||
      !value.end_time ||
      toMinutes(value.end_time) > toMinutes(value.start_time),
    { message: 'end_time debe ser posterior a start_time', path: ['end_time'] },
  );

export const listSchedulesQuerySchema = z.object({
  /** Cualquier fecha dentro de la semana a consultar (YYYY-MM-DD) */
  week: z.string().date().optional(),
  course_id: z.uuid().optional(),
});

export const uuidParamSchema = z.object({
  id: z.uuid(),
});
