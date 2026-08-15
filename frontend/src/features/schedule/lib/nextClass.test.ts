import { describe, expect, it } from 'vitest';
import type { Schedule } from '../services/scheduleService';
import { findEndedToday, findNextClass, formatClassWhen, formatCountdown, greetingFor } from './nextClass';

function schedule(partial: Partial<Schedule> & Pick<Schedule, 'day_of_week' | 'start_time'>): Schedule {
  return {
    id: 's1',
    course_id: 'c1',
    classroom_id: null,
    recurrence: 'weekly',
    valid_from: null,
    valid_until: null,
    course: { id: 'c1', name: 'Cálculo I', color: null, modality: 'in_person' },
    classroom: null,
    end_time: '21:00',
    ...partial,
  };
}

describe('nextClass', () => {
  it('elige la ocurrencia futura más cercana', () => {
    const now = new Date(2026, 7, 15, 10, 0, 0); // sábado
    const next = findNextClass(
      [
        schedule({ id: 'later', day_of_week: 1, start_time: '18:00' }),
        schedule({ id: 'soon', day_of_week: 6, start_time: '18:00' }),
      ],
      now,
    );
    expect(next?.schedule.id).toBe('soon');
    expect(formatClassWhen(next!.startsAt, now)).toMatch(/^Hoy /);
  });

  it('omite una clase de hoy que ya pasó', () => {
    const now = new Date(2026, 7, 15, 19, 0, 0);
    const next = findNextClass([schedule({ day_of_week: 6, start_time: '18:00' })], now);
    expect(next?.startsAt.getDay()).toBe(6);
    expect(next?.startsAt.getDate()).toBe(22);
  });

  it('detecta la clase de hoy que ya terminó', () => {
    const now = new Date(2026, 7, 15, 19, 0, 0);
    const ended = findEndedToday(
      [schedule({ day_of_week: 6, start_time: '18:00', end_time: '18:50' })],
      now,
    );
    expect(ended?.schedule.start_time).toBe('18:00');
  });

  it('formatea countdown y saludo', () => {
    const now = new Date(2026, 7, 15, 14, 0, 0);
    const startsAt = new Date(2026, 7, 15, 18, 32, 0);
    expect(formatCountdown(startsAt, now)).toBe('en 4h 32m');
    expect(greetingFor(now)).toBe('Buenas tardes');
  });
});
