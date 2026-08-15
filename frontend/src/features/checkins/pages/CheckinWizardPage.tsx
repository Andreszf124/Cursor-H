import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert } from '../../../components/feedback/Alert';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Input } from '../../../components/ui/Input';
import { ApiError } from '../../../services/api/client';
import { coursesService } from '../../courses/services/coursesService';
import { checkinsService, type ReinforceTopic } from '../../learning/services/learningService';
import { toISODate } from '../../schedule/lib/nextClass';

const LEVELS = [
  { value: 1, label: 'Nada' },
  { value: 2, label: 'Poco' },
  { value: 3, label: 'Regular' },
  { value: 4, label: 'Bien' },
  { value: 5, label: 'Muy bien' },
] as const;

type Step = 'topics' | 'comprehension' | 'result';

export function CheckinWizardPage() {
  const { courseId = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const classDate = params.get('date') ?? toISODate(new Date());
  const rawScheduleId = params.get('schedule');
  const scheduleId =
    rawScheduleId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      rawScheduleId,
    )
      ? rawScheduleId
      : null;

  const [step, setStep] = useState<Step>('topics');
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [selectedOverride, setSelectedOverride] = useState<string[] | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [levelOverride, setLevelOverride] = useState<number | null>(null);
  const [difficultiesOverride, setDifficultiesOverride] = useState<string | null>(null);
  const [reinforce, setReinforce] = useState<ReinforceTopic[]>([]);

  const courseQuery = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => coursesService.getCourse(courseId),
    enabled: Boolean(courseId),
  });
  const existingQuery = useQuery({
    queryKey: ['checkins', courseId],
    queryFn: () => checkinsService.listByCourse(courseId),
    enabled: Boolean(courseId),
  });

  const existing = useMemo(
    () =>
      (existingQuery.data?.checkins ?? []).find(
        (item) => item.class_date === classDate && item.status !== 'skipped',
      ),
    [existingQuery.data, classDate],
  );

  const create = useMutation({
    mutationFn: () =>
      checkinsService.create({
        course_id: courseId,
        schedule_id: scheduleId,
        class_date: classDate,
      }),
    onSuccess: (checkin) => {
      setCreatedId(checkin.id);
      void queryClient.invalidateQueries({ queryKey: ['checkins', courseId] });
    },
  });

  const checkinId =
    createdId ?? (existing && existing.status !== 'completed' ? existing.id : null);

  const detailQuery = useQuery({
    queryKey: ['checkin', checkinId],
    queryFn: () => checkinsService.get(checkinId!),
    enabled: Boolean(checkinId),
  });

  const selected =
    selectedOverride ?? (detailQuery.data?.topics ?? []).map((item) => item.topic);
  const level = levelOverride ?? detailQuery.data?.comprehension_level ?? null;
  const difficulties = difficultiesOverride ?? detailQuery.data?.difficulties ?? '';

  const saveTopics = useMutation({
    mutationFn: () => checkinsService.recordTopics(checkinId!, selected, 'student'),
    onSuccess: () => setStep('comprehension'),
  });
  const saveComprehension = useMutation({
    mutationFn: () =>
      checkinsService.recordComprehension(checkinId!, {
        comprehension_level: level ?? 3,
        difficulties: difficulties.trim() || null,
      }),
  });
  const complete = useMutation({
    mutationFn: () => checkinsService.complete(checkinId!),
    onSuccess: (result) => {
      setReinforce(result.reinforce);
      setStep('result');
      void queryClient.invalidateQueries({ queryKey: ['checkins'] });
      void queryClient.invalidateQueries({ queryKey: ['progress-concepts'] });
      void queryClient.invalidateQueries({ queryKey: ['gaps-prioritized'] });
      void queryClient.invalidateQueries({ queryKey: ['concepts', courseId] });
    },
  });

  const suggestions = detailQuery.data?.suggestions ?? [];
  const allTopics = [...new Set([...suggestions, ...selected])];
  const courseName = courseQuery.data?.name ?? 'esta clase';

  if (courseQuery.error instanceof ApiError && courseQuery.error.status === 404) {
    return (
      <EmptyState
        title="No encontrado"
        description="Este curso no existe o no te pertenece."
        action={<ButtonLink to="/courses" variant="secondary">Volver a mis cursos</ButtonLink>}
      />
    );
  }

  if (step === 'result') {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-slate-900">Según lo que respondiste</h1>
          <p className="mt-1 text-sm text-slate-500">{courseName} · {classDate}</p>
        </header>
        {reinforce.length > 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Conviene reforzar</p>
            <ul className="mt-3 space-y-2">
              {reinforce.map((item) => (
                <li key={item.concept_id} className="text-slate-800">
                  {item.name}
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <EmptyState
            title="Buen registro"
            description="No vimos un tema urgente para reforzar. Igual puedes practicar cuando quieras."
          />
        )}
        <div className="flex flex-wrap gap-3">
          {reinforce[0] ? (
            <ButtonLink
              to={`/courses/${courseId}?tab=practica&concept=${reinforce[0].concept_id}`}
            >
              Hacer práctica
            </ButtonLink>
          ) : (
            <ButtonLink to={`/courses/${courseId}?tab=practica`}>Hacer práctica</ButtonLink>
          )}
          <ButtonLink to={`/tutor?course=${courseId}`} variant="secondary">
            Repasar ahora
          </ButtonLink>
          <ButtonLink to={`/courses/${courseId}?tab=clases`} variant="secondary">
            Lo haré después
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-slate-500">
          <Link to={`/courses/${courseId}?tab=clases`} className="hover:underline">
            {courseName}
          </Link>
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">¿Cómo te fue en {courseName}?</h1>
        <p className="mt-1 text-sm text-slate-500">{classDate}</p>
      </header>

      {!checkinId && existing?.status === 'completed' ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Ya registraste cómo te fue en esta clase.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <ButtonLink to={`/courses/${courseId}?tab=practica`}>Hacer práctica</ButtonLink>
            <ButtonLink to={`/courses/${courseId}?tab=clases`} variant="secondary">
              Volver a clases
            </ButtonLink>
          </div>
        </section>
      ) : null}

      {!checkinId && existing?.status !== 'completed' ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {create.error && <Alert variant="error">{create.error.message}</Alert>}
          <p className="text-sm text-slate-600">Registra lo que vieron hoy para saber qué practicar después.</p>
          <Button className="mt-4" loading={create.isPending} onClick={() => create.mutate()}>
            Empezar check-in
          </Button>
        </section>
      ) : null}

      {checkinId && step === 'topics' ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">¿Qué vieron hoy?</h2>
          {detailQuery.isLoading ? <p className="mt-3 text-sm text-slate-500">Cargando temas…</p> : null}
          <ul className="mt-4 space-y-2">
            {allTopics.map((topic) => {
              const checked = selected.includes(topic);
              return (
                <li key={topic}>
                  <label className="flex items-center gap-3 text-sm text-slate-800">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedOverride(
                          checked ? selected.filter((item) => item !== topic) : [...selected, topic],
                        )
                      }
                    />
                    {topic}
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex gap-2">
            <Input
              id="custom-topic"
              label="Otro tema"
              value={customTopic}
              onChange={(event) => setCustomTopic(event.target.value)}
            />
          </div>
          <Button
            className="mt-2"
            variant="secondary"
            disabled={!customTopic.trim()}
            onClick={() => {
              const topic = customTopic.trim();
              setSelectedOverride(selected.includes(topic) ? selected : [...selected, topic]);
              setCustomTopic('');
            }}
          >
            Agregar tema
          </Button>
          {saveTopics.error && <Alert variant="error">{saveTopics.error.message}</Alert>}
          <Button
            className="mt-4"
            loading={saveTopics.isPending}
            disabled={selected.length === 0}
            onClick={() => saveTopics.mutate()}
          >
            Continuar
          </Button>
        </section>
      ) : null}

      {checkinId && step === 'comprehension' ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">¿Cuánto comprendiste?</h2>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {LEVELS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`rounded-xl border px-2 py-3 text-sm ${
                  level === item.value
                    ? 'border-indigo-600 bg-indigo-50 font-medium text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
                onClick={() => setLevelOverride(item.value)}
              >
                <span className="block text-lg font-semibold">{item.value}</span>
                {item.label}
              </button>
            ))}
          </div>
          <label className="mt-5 block text-sm font-medium text-slate-700" htmlFor="difficulties">
            ¿Qué parte te costó más?
          </label>
          <textarea
            id="difficulties"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            rows={3}
            value={difficulties}
            onChange={(event) => setDifficultiesOverride(event.target.value)}
          />
          {(saveComprehension.error || complete.error) && (
            <Alert variant="error">{(saveComprehension.error ?? complete.error)?.message ?? ''}</Alert>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setStep('topics')}>
              Atrás
            </Button>
            <Button
              loading={saveComprehension.isPending || complete.isPending}
              disabled={level == null}
              onClick={() => {
                saveComprehension.mutate(undefined, {
                  onSuccess: () => complete.mutate(),
                });
              }}
            >
              Guardar
            </Button>
          </div>
        </section>
      ) : null}

      {create.isPending ? null : (
        <button type="button" className="text-sm text-slate-500 hover:underline" onClick={() => navigate(-1)}>
          Cancelar
        </button>
      )}
    </div>
  );
}
