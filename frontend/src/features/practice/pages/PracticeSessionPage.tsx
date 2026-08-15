import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../../../components/feedback/Alert';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ApiError } from '../../../services/api/client';
import { practiceService, type ExerciseAttempt } from '../../learning/services/learningService';

function exerciseOptions(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function PracticeSessionPage() {
  const { practiceId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<ExerciseAttempt | null>(null);
  const startedAt = useRef<number | null>(null);

  const detailQuery = useQuery({
    queryKey: ['practice', practiceId],
    queryFn: () => practiceService.get(practiceId),
    enabled: Boolean(practiceId),
  });

  const exercises = useMemo(
    () => [...(detailQuery.data?.exercises ?? [])].sort((a, b) => a.position - b.position),
    [detailQuery.data],
  );
  const exercise = exercises[index];
  const total = exercises.length;
  const previous = exercise?.last_attempt;
  const shownResult =
    result ??
    (previous
      ? {
          id: 'previous',
          is_correct: previous.is_correct,
          score: previous.score,
          feedback: previous.feedback,
          solution: null,
        }
      : null);
  const shownAnswer = answer || previous?.answer || '';

  const submit = useMutation({
    mutationFn: () => {
      startedAt.current ??= Date.now();
      return practiceService.submit(exercise!.id, {
        answer: shownAnswer.trim(),
        time_spent_seconds: Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)),
      });
    },
    onSuccess: (attempt) => {
      setResult(attempt);
      void queryClient.invalidateQueries({ queryKey: ['practice', practiceId] });
    },
  });

  const finish = useMutation({
    mutationFn: () => practiceService.complete(practiceId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['practices'] });
      void queryClient.invalidateQueries({ queryKey: ['progress-overview'] });
      void queryClient.invalidateQueries({ queryKey: ['progress-concepts'] });
    },
  });

  if (detailQuery.error instanceof ApiError && detailQuery.error.status === 404) {
    return (
      <EmptyState
        title="No encontrado"
        description="Esta práctica no existe o no te pertenece."
        action={<ButtonLink to="/practice" variant="secondary">Volver a práctica</ButtonLink>}
      />
    );
  }

  if (detailQuery.isLoading) {
    return <p className="text-sm text-slate-500">Cargando la práctica…</p>;
  }

  if (detailQuery.error || !detailQuery.data) {
    return <Alert variant="error">No se pudo cargar la práctica.</Alert>;
  }

  if (!exercise) {
    return (
      <EmptyState
        title="Esta práctica no tiene ejercicios"
        description="Genera otra a partir de lo visto en clase."
        action={<ButtonLink to="/practice" variant="secondary">Volver</ButtonLink>}
      />
    );
  }

  if (finish.isSuccess && finish.data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">Práctica completada</h1>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">{detailQuery.data.title}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {finish.data.score != null ? `${Math.round(finish.data.score)}%` : '—'}
          </p>
        </section>
        <div className="flex flex-wrap gap-3">
          {detailQuery.data.course_id ? (
            <ButtonLink to={`/courses/${detailQuery.data.course_id}?tab=practica`}>Volver al curso</ButtonLink>
          ) : (
            <ButtonLink to="/practice">Ver prácticas</ButtonLink>
          )}
        </div>
      </div>
    );
  }

  const options = exerciseOptions(exercise.options);
  const isLast = index === total - 1;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-slate-500">
          <Link to="/practice" className="hover:underline">
            Práctica
          </Link>
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{detailQuery.data.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pregunta {index + 1} de {total}
        </p>
        <p className="mt-2 text-sm text-slate-600">Esta práctica fue creada a partir de lo visto en tu clase.</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-base font-medium text-slate-900">{exercise.statement}</p>

        {options.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {options.map((option) => (
              <li key={option}>
                <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <input
                    type="radio"
                    name="answer"
                    value={option}
                    checked={shownAnswer === option}
                    disabled={Boolean(shownResult)}
                    onChange={() => setAnswer(option)}
                  />
                  {option}
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <textarea
            className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            rows={4}
            value={shownAnswer}
            disabled={Boolean(shownResult)}
            onChange={(event) => setAnswer(event.target.value)}
            aria-label="Tu respuesta"
          />
        )}

        {submit.error && <div className="mt-3"><Alert variant="error">{submit.error.message}</Alert></div>}

        {shownResult ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p className={`font-medium ${shownResult.is_correct ? 'text-emerald-700' : 'text-red-700'}`}>
              {shownResult.is_correct ? 'Correcto' : 'Incorrecto'}
            </p>
            <p className="mt-1 text-slate-600">{shownResult.feedback}</p>
            {!shownResult.is_correct && shownResult.solution ? (
              <p className="mt-2 text-slate-700">{shownResult.solution}</p>
            ) : null}
          </div>
        ) : (
          <Button
            className="mt-4"
            loading={submit.isPending}
            disabled={!shownAnswer.trim()}
            onClick={() => submit.mutate()}
          >
            Comprobar
          </Button>
        )}
      </section>

      {shownResult ? (
        <div className="flex flex-wrap gap-3">
          {!isLast ? (
            <Button
              onClick={() => {
                setIndex((current) => current + 1);
                setAnswer('');
                setResult(null);
                startedAt.current = Date.now();
              }}
            >
              Siguiente
            </Button>
          ) : (
            <Button loading={finish.isPending} onClick={() => finish.mutate()}>
              Terminar práctica
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Salir
          </Button>
        </div>
      ) : null}
    </div>
  );
}
