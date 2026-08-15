import type { Schedule } from '../services/scheduleService';

const WEEKDAY_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function toISODate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function splitTime(time: string): { hours: number; minutes: number } {
  const [hours = '0', minutes = '0'] = time.split(':');
  return { hours: Number.parseInt(hours, 10), minutes: Number.parseInt(minutes, 10) };
}

function occursOn(schedule: Schedule, isoDate: string): boolean {
  if (schedule.valid_from && isoDate < schedule.valid_from) return false;
  if (schedule.valid_until && isoDate > schedule.valid_until) return false;
  if (schedule.recurrence === 'once') return schedule.valid_from === isoDate;
  return true;
}

export function findNextClass(
  schedules: Schedule[],
  now: Date = new Date(),
): { schedule: Schedule; startsAt: Date } | null {
  let best: { schedule: Schedule; startsAt: Date } | null = null;

  for (const schedule of schedules) {
    const startsAt = nextStart(schedule, now);
    if (!startsAt) continue;
    if (!best || startsAt.getTime() < best.startsAt.getTime()) {
      best = { schedule, startsAt };
    }
  }

  return best;
}

export function findEndedToday(
  schedules: Schedule[],
  now: Date = new Date(),
): { schedule: Schedule; endedAt: Date } | null {
  const today = toISODate(now);
  let best: { schedule: Schedule; endedAt: Date } | null = null;

  for (const schedule of schedules) {
    if (schedule.day_of_week !== now.getDay()) continue;
    if (!occursOn(schedule, today)) continue;
    const { hours, minutes } = splitTime(schedule.end_time);
    const endedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
    if (endedAt.getTime() > now.getTime()) continue;
    if (!best || endedAt.getTime() > best.endedAt.getTime()) {
      best = { schedule, endedAt };
    }
  }

  return best;
}

function nextStart(schedule: Schedule, now: Date): Date | null {
  for (let offset = 0; offset < 14; offset += 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    if (day.getDay() !== schedule.day_of_week) continue;
    const isoDate = toISODate(day);
    if (!occursOn(schedule, isoDate)) continue;
    const { hours, minutes } = splitTime(schedule.start_time);
    const startsAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes, 0, 0);
    if (startsAt.getTime() > now.getTime()) return startsAt;
  }
  return null;
}

export function formatClock(time: string): string {
  const { hours, minutes } = splitTime(time);
  const date = new Date(1970, 0, 1, hours, minutes);
  return date.toLocaleTimeString('es-CR', { hour: 'numeric', minute: '2-digit' });
}

export function formatClassWhen(startsAt: Date, now: Date = new Date()): string {
  const clock = startsAt.toLocaleTimeString('es-CR', { hour: 'numeric', minute: '2-digit' });
  const today = toISODate(now);
  const target = toISODate(startsAt);
  if (target === today) return `Hoy ${clock}`;
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (target === toISODate(tomorrow)) return `Mañana ${clock}`;
  return `${WEEKDAY_LONG[startsAt.getDay()] ?? ''} ${clock}`.trim();
}

export function formatCountdown(startsAt: Date, now: Date = new Date()): string | null {
  const diffMs = startsAt.getTime() - now.getTime();
  if (diffMs <= 0) return null;
  const totalMinutes = Math.round(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `en ${minutes} min`;
  return `en ${hours}h ${minutes}m`;
}

export function greetingFor(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function firstName(fullName: string | null | undefined, fallback: string): string {
  const trimmed = fullName?.trim();
  if (!trimmed) return fallback;
  return trimmed.split(/\s+/)[0] ?? fallback;
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function startOfWeek(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

export function isInCurrentWeek(isoDate: string, now: Date = new Date()): boolean {
  const monday = startOfWeek(now);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return isoDate >= toISODate(monday) && isoDate <= toISODate(sunday);
}
