import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { coursesService } from '../../courses/services/coursesService';
import { practiceService } from '../../learning/services/learningService';
import { usePomodoro } from '../hooks/usePomodoro';
import { formatTimer, POMODORO_SECONDS } from '../lib/timer';

interface SidebarPomodoroProps {
  durationSeconds?: number;
  compact?: boolean;
  idPrefix?: string;
}

export function SidebarPomodoro({
  durationSeconds = POMODORO_SECONDS,
  compact = false,
  idPrefix = 'pomodoro',
}: SidebarPomodoroProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [courseId, setCourseId] = useState('');
  const launchedRef = useRef(false);
  const courseIdRef = useRef(courseId);
  courseIdRef.current = courseId;

  const coursesQuery = useQuery({
    queryKey: ['courses', 'all'],
    queryFn: () => coursesService.listCourses(),
  });
  const courses = coursesQuery.data?.courses ?? [];

  const generate = useMutation({
    mutationFn: (id: string) =>
      practiceService.generate({
        course_id: id,
        exercise_count: 5,
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['practices'] });
      reset();
      navigate(`/practice/${result.practice.id}`);
    },
  });

  const askCourseQuestions = (id = courseIdRef.current): void => {
    if (!id || generate.isPending || launchedRef.current) return;
    launchedRef.current = true;
    generate.mutate(id, {
      onSettled: () => {
        launchedRef.current = false;
      },
    });
  };

  const { status, remainingSeconds, start, pause, reset } = usePomodoro({
    durationSeconds,
    onFinished: () => {
      askCourseQuestions();
    },
  });

  const coursesReady = courses.length > 0;
  const selectedName = courses.find((course) => course.id === courseId)?.name;
  const waitingForCourse = status === 'finished' && !courseId;

  return (
    <section
      aria-labelledby={`${idPrefix}-heading`}
      className={compact ? 'space-y-2' : 'space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3'}
    >
      <div>
        <h2 id={`${idPrefix}-heading`} className="text-sm font-semibold text-slate-900">
          Pomodoro
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">Al terminar, preguntas del curso.</p>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-course`} className="block text-xs font-medium text-slate-700">
          Curso
        </label>
        <select
          id={`${idPrefix}-course`}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
          value={courseId}
          disabled={status === 'running'}
          onChange={(event) => setCourseId(event.target.value)}
        >
          <option value="">{coursesReady ? 'Elige un curso' : 'Sin cursos todavía'}</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>
      </div>

      <p className="font-mono text-2xl tabular-nums text-slate-900" aria-live="off">
        {formatTimer(remainingSeconds)}
      </p>
      <p className="sr-only" aria-live="polite">
        {status === 'running'
          ? 'Pomodoro en curso'
          : status === 'finished'
            ? 'Pomodoro terminado'
            : 'Pomodoro en pausa'}
      </p>

      {generate.error ? (
        <p role="alert" className="text-xs text-red-700">
          {generate.error.message}
        </p>
      ) : null}
      {waitingForCourse ? (
        <p className="text-xs text-slate-600">Elige el curso para generar las preguntas.</p>
      ) : null}
      {generate.isPending ? (
        <p className="text-xs text-slate-600">
          Armando preguntas{selectedName ? ` de ${selectedName}` : ''}…
        </p>
      ) : null}

      <div className={`flex ${compact ? 'flex-wrap' : 'flex-col'} gap-2`}>
        {status === 'running' ? (
          <Button variant="secondary" className="w-full px-3 py-1.5 text-xs" onClick={pause}>
            Pausar
          </Button>
        ) : (
          <Button
            className="w-full px-3 py-1.5 text-xs"
            onClick={start}
            disabled={status === 'finished' && generate.isPending}
          >
            {status === 'paused' ? 'Reanudar' : status === 'finished' ? 'Otro pomodoro' : 'Iniciar'}
          </Button>
        )}
        {status === 'finished' && courseId ? (
          <Button
            variant="secondary"
            className="w-full px-3 py-1.5 text-xs"
            loading={generate.isPending}
            onClick={() => askCourseQuestions()}
          >
            Hacer preguntas
          </Button>
        ) : null}
        {status !== 'idle' && status !== 'finished' ? (
          <Button variant="secondary" className="w-full px-3 py-1.5 text-xs" onClick={reset}>
            Reiniciar
          </Button>
        ) : null}
      </div>
    </section>
  );
}
