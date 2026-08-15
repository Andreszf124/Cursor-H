import type { z } from 'zod';
import type { createScheduleSchema, updateScheduleSchema } from './schedule.schemas.js';

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;

export type Recurrence = 'weekly' | 'biweekly' | 'once';

export interface ScheduleCourseRef {
  id: string;
  name: string;
  color: string | null;
  modality: string;
}

export interface ScheduleClassroomRef {
  id: string;
  name: string;
  location: string | null;
  virtual_url: string | null;
}

export interface ScheduleDTO {
  id: string;
  course_id: string;
  classroom_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  recurrence: Recurrence;
  valid_from: string | null;
  valid_until: string | null;
  course: ScheduleCourseRef | null;
  classroom: ScheduleClassroomRef | null;
}

export interface WeekScheduleDTO {
  week_start: string;
  week_end: string;
  schedules: (ScheduleDTO & { date: string })[];
}

/** RF-041 — clase en curso que termina pronto */
export interface UpcomingClassDTO extends ScheduleDTO {
  ends_at: string;
  ends_in_minutes: number;
  in_session: boolean;
}
