import type { SupabaseClient } from '@supabase/supabase-js';
import { createUserClient } from '../../infrastructure/database/supabase.client.js';
import { AppError, NotFoundError } from '../../shared/errors/app-error.js';
import { assertOwnedRow } from '../../shared/utils/ownership.js';
import type {
  CreateScheduleInput,
  Recurrence,
  ScheduleClassroomRef,
  ScheduleCourseRef,
  ScheduleDTO,
  UpcomingClassDTO,
  UpdateScheduleInput,
  WeekScheduleDTO,
} from './schedule.types.js';

const SCHEDULE_COLUMNS =
  'id, course_id, classroom_id, day_of_week, start_time, end_time, recurrence, valid_from, valid_until';

/** RF-041 — ventana de aviso de fin de clase */
export const CLASS_END_WINDOW_MINUTES = 30;

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

function normalizeTime(time: string): string {
  const [hours = '00', minutes = '00', seconds = '00'] = time.split(':');
  return `${hours.padStart(2, '0')}:${minutes}:${seconds}`;
}

function splitTime(time: string): { hours: number; minutes: number } {
  const [hours = '0', minutes = '0'] = time.split(':');
  return { hours: Number.parseInt(hours, 10), minutes: Number.parseInt(minutes, 10) };
}

function toISODate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Lunes de la semana que contiene la fecha dada */
function startOfWeek(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

function parseISODate(value: string): Date {
  const [year = '1970', month = '01', day = '01'] = value.split('-');
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function weeksBetween(from: string, target: string): number {
  const diff = startOfWeek(parseISODate(target)).getTime() - startOfWeek(parseISODate(from)).getTime();
  return Math.round(diff / (7 * MS_PER_DAY));
}

interface OccurrenceRules {
  recurrence: Recurrence;
  valid_from: string | null;
  valid_until: string | null;
}

/** ¿El horario aplica en la fecha dada, según vigencia y recurrencia? */
export function occursOn(rules: OccurrenceRules, isoDate: string): boolean {
  if (rules.valid_from && isoDate < rules.valid_from) return false;
  if (rules.valid_until && isoDate > rules.valid_until) return false;
  if (rules.recurrence === 'once') return rules.valid_from === isoDate;
  if (rules.recurrence === 'biweekly' && rules.valid_from) {
    return weeksBetween(rules.valid_from, isoDate) % 2 === 0;
  }
  return true;
}

/**
 * Todas las escrituras fijan student_id desde el JWT y validan que el curso
 * y el aula referenciados sean del propio estudiante (SECURITY.md R1).
 */
export class ScheduleService {
  /** RF-037, RF-038 */
  async listSchedules(
    token: string,
    userId: string,
    filters: { courseId?: string } = {},
  ): Promise<ScheduleDTO[]> {
    const supabase = createUserClient(token);
    let query = supabase.from('schedules').select(SCHEDULE_COLUMNS).eq('student_id', userId);

    if (filters.courseId) {
      query = query.eq('course_id', filters.courseId);
    }

    const { data, error } = await query.order('day_of_week').order('start_time');
    if (error) throw new AppError('No se pudieron listar los horarios', 500, 'DB_ERROR');

    return this.decorate(supabase, userId, (data ?? []) as Record<string, unknown>[]);
  }

  /** RF-039 — vista semanal */
  async getWeek(
    token: string,
    userId: string,
    week: string | undefined,
    now: Date = new Date(),
  ): Promise<WeekScheduleDTO> {
    const reference = week ? parseISODate(week) : now;
    const monday = startOfWeek(reference);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const schedules = await this.listSchedules(token, userId);
    const expanded: (ScheduleDTO & { date: string })[] = [];

    for (let offset = 0; offset < 7; offset += 1) {
      const day = new Date(monday);
      day.setDate(day.getDate() + offset);
      const isoDate = toISODate(day);

      for (const schedule of schedules) {
        if (schedule.day_of_week !== day.getDay()) continue;
        if (!occursOn(schedule, isoDate)) continue;
        expanded.push({ ...schedule, date: isoDate });
      }
    }

    return {
      week_start: toISODate(monday),
      week_end: toISODate(sunday),
      schedules: expanded,
    };
  }

  /** RF-041 — clases que terminan dentro de la ventana de aviso (30 min por defecto) */
  async getUpcoming(
    token: string,
    userId: string,
    now: Date = new Date(),
    windowMinutes: number = CLASS_END_WINDOW_MINUTES,
  ): Promise<UpcomingClassDTO[]> {
    const schedules = await this.listSchedules(token, userId);
    const upcoming: UpcomingClassDTO[] = [];

    for (const schedule of schedules) {
      const end = this.nextOccurrence(now, schedule.day_of_week, schedule.end_time);
      const endsInMinutes = Math.round((end.getTime() - now.getTime()) / MS_PER_MINUTE);

      if (endsInMinutes <= 0 || endsInMinutes > windowMinutes) continue;
      if (!occursOn(schedule, toISODate(end))) continue;

      const start = this.nextOccurrence(now, schedule.day_of_week, schedule.start_time);
      upcoming.push({
        ...schedule,
        ends_at: end.toISOString(),
        ends_in_minutes: endsInMinutes,
        in_session: start.getTime() <= now.getTime() || start.getTime() > end.getTime(),
      });
    }

    return upcoming.sort((a, b) => a.ends_in_minutes - b.ends_in_minutes);
  }

  async createSchedule(
    token: string,
    userId: string,
    input: CreateScheduleInput,
  ): Promise<ScheduleDTO> {
    const supabase = createUserClient(token);
    await assertOwnedRow(supabase, 'courses', input.course_id, userId, 'Curso no encontrado');
    if (input.classroom_id) {
      await assertOwnedRow(supabase, 'classrooms', input.classroom_id, userId, 'Aula no encontrada');
    }

    const { data, error } = await supabase
      .from('schedules')
      .insert({
        student_id: userId,
        course_id: input.course_id,
        classroom_id: input.classroom_id ?? null,
        day_of_week: input.day_of_week,
        start_time: normalizeTime(input.start_time),
        end_time: normalizeTime(input.end_time),
        recurrence: input.recurrence,
        valid_from: input.valid_from ?? null,
        valid_until: input.valid_until ?? null,
      })
      .select(SCHEDULE_COLUMNS)
      .single();

    if (error || !data) throw new AppError('No se pudo crear el horario', 500, 'DB_ERROR');
    const [decorated] = await this.decorate(supabase, userId, [data as Record<string, unknown>]);
    if (!decorated) throw new AppError('No se pudo crear el horario', 500, 'DB_ERROR');
    return decorated;
  }

  async updateSchedule(
    token: string,
    userId: string,
    scheduleId: string,
    input: UpdateScheduleInput,
  ): Promise<ScheduleDTO> {
    const supabase = createUserClient(token);
    await assertOwnedRow(supabase, 'schedules', scheduleId, userId, 'Horario no encontrado');
    if (input.classroom_id) {
      await assertOwnedRow(supabase, 'classrooms', input.classroom_id, userId, 'Aula no encontrada');
    }

    const payload: Record<string, unknown> = { ...input };
    if (input.start_time) payload.start_time = normalizeTime(input.start_time);
    if (input.end_time) payload.end_time = normalizeTime(input.end_time);

    const { data, error } = await supabase
      .from('schedules')
      .update(payload)
      .eq('id', scheduleId)
      .eq('student_id', userId)
      .select(SCHEDULE_COLUMNS)
      .single();

    if (error || !data) throw new AppError('No se pudo actualizar el horario', 500, 'DB_ERROR');
    const [decorated] = await this.decorate(supabase, userId, [data as Record<string, unknown>]);
    if (!decorated) throw new AppError('No se pudo actualizar el horario', 500, 'DB_ERROR');
    return decorated;
  }

  async getSchedule(token: string, userId: string, scheduleId: string): Promise<ScheduleDTO> {
    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('schedules')
      .select(SCHEDULE_COLUMNS)
      .eq('id', scheduleId)
      .eq('student_id', userId)
      .maybeSingle();

    if (error) throw new AppError('No se pudo obtener el horario', 500, 'DB_ERROR');
    if (!data) throw new NotFoundError('Horario no encontrado');

    const [decorated] = await this.decorate(supabase, userId, [data as Record<string, unknown>]);
    if (!decorated) throw new NotFoundError('Horario no encontrado');
    return decorated;
  }

  async deleteSchedule(token: string, userId: string, scheduleId: string): Promise<void> {
    const supabase = createUserClient(token);
    await assertOwnedRow(supabase, 'schedules', scheduleId, userId, 'Horario no encontrado');
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', scheduleId)
      .eq('student_id', userId);

    if (error) throw new AppError('No se pudo eliminar el horario', 500, 'DB_ERROR');
  }

  /** Próxima ocurrencia (hoy incluido si aún no pasó) de una hora en un día de la semana */
  private nextOccurrence(now: Date, dayOfWeek: number, time: string): Date {
    const { hours, minutes } = splitTime(time);
    const result = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
    result.setDate(result.getDate() + ((dayOfWeek - now.getDay() + 7) % 7));
    return result;
  }

  /**
   * Añade curso y aula con consultas separadas en lugar de embeds de PostgREST:
   * mantiene las políticas RLS simples y el filtrado por student_id explícito.
   */
  private async decorate(
    supabase: SupabaseClient,
    userId: string,
    rows: Record<string, unknown>[],
  ): Promise<ScheduleDTO[]> {
    if (rows.length === 0) return [];

    const { data: courses } = await supabase
      .from('courses')
      .select('id, name, color, modality')
      .eq('student_id', userId);

    const { data: classrooms } = await supabase
      .from('classrooms')
      .select('id, name, location, virtual_url')
      .eq('student_id', userId);

    const courseById = new Map<string, ScheduleCourseRef>(
      (courses ?? []).map((course) => [
        (course as ScheduleCourseRef).id,
        course as ScheduleCourseRef,
      ]),
    );
    const classroomById = new Map<string, ScheduleClassroomRef>(
      (classrooms ?? []).map((classroom) => [
        (classroom as ScheduleClassroomRef).id,
        classroom as ScheduleClassroomRef,
      ]),
    );

    return rows.map((row) => {
      const classroomId = (row.classroom_id as string | null) ?? null;
      return {
        id: row.id as string,
        course_id: row.course_id as string,
        classroom_id: classroomId,
        day_of_week: row.day_of_week as number,
        start_time: normalizeTime(String(row.start_time)),
        end_time: normalizeTime(String(row.end_time)),
        recurrence: (row.recurrence as Recurrence) ?? 'weekly',
        valid_from: (row.valid_from as string | null) ?? null,
        valid_until: (row.valid_until as string | null) ?? null,
        course: courseById.get(row.course_id as string) ?? null,
        classroom: classroomId ? classroomById.get(classroomId) ?? null : null,
      };
    });
  }
}

export const scheduleService = new ScheduleService();

/** Helper para otros módulos (notificaciones, preparación de clase) */
export async function listUpcomingSchedules(
  token: string,
  userId: string,
  withinMinutes = CLASS_END_WINDOW_MINUTES,
): Promise<UpcomingClassDTO[]> {
  return scheduleService.getUpcoming(token, userId, new Date(), withinMinutes);
}
