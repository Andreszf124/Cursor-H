import { useEffect, useRef, useState } from 'react';
import { POMODORO_SECONDS } from '../lib/timer';

export type PomodoroStatus = 'idle' | 'running' | 'paused' | 'finished';

interface UsePomodoroOptions {
  durationSeconds?: number;
  onFinished?: () => void;
}

export function usePomodoro({ durationSeconds = POMODORO_SECONDS, onFinished }: UsePomodoroOptions = {}) {
  const [status, setStatus] = useState<PomodoroStatus>('idle');
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);
  const endAtRef = useRef<number | null>(null);
  const notifiedRef = useRef(false);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  useEffect(() => {
    if (status === 'idle') {
      setRemainingSeconds(durationSeconds);
    }
  }, [durationSeconds, status]);

  useEffect(() => {
    if (status !== 'running' || endAtRef.current === null) return undefined;

    const tick = (): void => {
      const left = Math.max(0, Math.round(((endAtRef.current ?? 0) - Date.now()) / 1000));
      setRemainingSeconds(left);
      if (left <= 0) {
        setStatus('finished');
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (status !== 'finished' || notifiedRef.current) return;
    notifiedRef.current = true;
    onFinishedRef.current?.();
  }, [status]);

  const start = (): void => {
    const base = status === 'paused' ? remainingSeconds : durationSeconds;
    notifiedRef.current = false;
    endAtRef.current = Date.now() + base * 1000;
    setRemainingSeconds(base);
    setStatus('running');
  };

  const pause = (): void => {
    if (status !== 'running') return;
    const left = Math.max(0, Math.round(((endAtRef.current ?? 0) - Date.now()) / 1000));
    endAtRef.current = null;
    setRemainingSeconds(left);
    setStatus(left <= 0 ? 'finished' : 'paused');
  };

  const reset = (): void => {
    notifiedRef.current = false;
    endAtRef.current = null;
    setRemainingSeconds(durationSeconds);
    setStatus('idle');
  };

  return { status, remainingSeconds, start, pause, reset };
}
