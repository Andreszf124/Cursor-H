import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePomodoro } from './usePomodoro';

describe('usePomodoro', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('cuenta hacia atrás y avisa al terminar', () => {
    const onFinished = vi.fn();
    const { result } = renderHook(() => usePomodoro({ durationSeconds: 2, onFinished }));

    act(() => {
      result.current.start();
    });
    expect(result.current.status).toBe('running');

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(result.current.status).toBe('finished');
    expect(result.current.remainingSeconds).toBe(0);
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('pausa y reanuda el tiempo restante', () => {
    const { result } = renderHook(() => usePomodoro({ durationSeconds: 10 }));

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    act(() => {
      result.current.pause();
    });
    expect(result.current.status).toBe('paused');
    const remaining = result.current.remainingSeconds;

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.remainingSeconds).toBe(remaining);

    act(() => {
      result.current.start();
    });
    expect(result.current.status).toBe('running');
  });
});
