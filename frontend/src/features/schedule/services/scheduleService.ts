import { apiFetch } from '../../../services/api/client';

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

export interface Schedule {
  id: string;
  course_id: string;
  classroom_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  recurrence: 'weekly' | 'biweekly' | 'once';
  valid_from: string | null;
  valid_until: string | null;
  course: ScheduleCourseRef | null;
  classroom: ScheduleClassroomRef | null;
}

export interface WeekSchedule {
  week_start: string;
  week_end: string;
  schedules: (Schedule & { date: string })[];
}

/** RF-041 — clase que termina en los próximos 30 minutos */
export interface UpcomingClass extends Schedule {
  ends_at: string;
  ends_in_minutes: number;
  in_session: boolean;
}

export interface CreateScheduleInput {
  course_id: string;
  classroom_id?: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  recurrence?: 'weekly' | 'biweekly' | 'once';
  valid_from?: string | null;
  valid_until?: string | null;
}

export const scheduleService = {
  listSchedules() {
    return apiFetch<{ schedules: Schedule[] }>('/api/v1/schedules');
  },
  getWeek(week: string) {
    return apiFetch<WeekSchedule>(`/api/v1/schedules?week=${encodeURIComponent(week)}`);
  },
  getUpcoming() {
    return apiFetch<{ upcoming: UpcomingClass[] }>('/api/v1/schedules/upcoming');
  },
  createSchedule(input: CreateScheduleInput) {
    return apiFetch<Schedule>('/api/v1/schedules', { method: 'POST', body: input });
  },
  deleteSchedule(id: string) {
    return apiFetch<void>(`/api/v1/schedules/${id}`, { method: 'DELETE' });
  },
};
