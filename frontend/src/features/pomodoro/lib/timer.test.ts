import { describe, expect, it } from 'vitest';
import { formatTimer, POMODORO_SECONDS } from './timer';

describe('formatTimer', () => {
  it('formatea minutos y segundos con dos dígitos', () => {
    expect(formatTimer(0)).toBe('00:00');
    expect(formatTimer(25 * 60)).toBe('25:00');
    expect(formatTimer(90)).toBe('01:30');
    expect(POMODORO_SECONDS).toBe(1500);
  });
});
