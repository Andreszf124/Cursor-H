import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Alert } from '../../../components/feedback/Alert';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { Tabs } from '../../../components/ui/Tabs';
import { ApiError } from '../../../services/api/client';
import {
  checkinsService,
  knowledgeService,
  MATERIAL_LABELS,
  materialsService,
  PRACTICE_STATUS,
  practiceService,
  resourceTopics,
  resourcesService,
  type Checkin,
  type Concept,
  type Material,
  type PracticeItem,
  type RecommendedResource,
} from '../../learning/services/learningService';
import { progressService, type ConceptMastery } from '../../progress/services/progressService';
import { CourseDocuments } from '../components/CourseDocuments';
import { CourseScheduleEditor } from '../components/CourseScheduleEditor';
import {
  findNextClass,
  formatClassWhen,
  formatClock,
  isInCurrentWeek,
  toISODate,
} from '../../schedule/lib/nextClass';
import { scheduleService, type Schedule } from '../../schedule/services/scheduleService';
import { coursesService } from '../services/coursesService';

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'clases', label: 'Clases' },
  { id: 'materiales', label: 'Materiales' },
  { id: 'practica', label: 'Práctica' },
  { id: 'progreso', label: 'Progreso' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function isTabId(value: string | null): value is TabId {
  return TABS.some((tab) => tab.id === value);
}

export function CourseDetailPage() {
  const { courseId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab');
  const tab: TabId = isTabId(rawTab) ? rawTab : 'resumen';

  const courseQuery = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => coursesService.getCourse(courseId),
    enabled: Boolean(courseId),
  });
  const schedulesQuery = useQuery({
    queryKey: ['schedules'],
    queryFn: scheduleService.listSchedules,
    enabled: Boolean(courseId),
  });
  const weekQuery = useQuery({
    queryKey: ['schedule-week', toISODate(new Date())],
    queryFn: () => scheduleService.getWeek(toISODate(new Date())),
    enabled: Boolean(courseId),
  });
  const conceptsQuery = useQuery({
    queryKey: ['concepts', courseId],
    queryFn: () => knowledgeService.listConcepts(courseId),
    enabled: Boolean(courseId),
  });
  const masteryQuery = useQuery({
    queryKey: ['progress-concepts', courseId],
    queryFn: () => progressService.byConcept(courseId),
    enabled: Boolean(courseId),
  });
  const materialsQuery = useQuery({
    queryKey: ['materials', courseId],
    queryFn: () => materialsService.listByCourse(courseId),
    enabled: Boolean(courseId),
  });
  const practicesQuery = useQuery({
    queryKey: ['practices', courseId],
    queryFn: () => practiceService.list(courseId),
    enabled: Boolean(courseId),
  });
  const checkinsQuery = useQuery({
    queryKey: ['checkins', courseId],
    queryFn: () => checkinsService.listByCourse(courseId),
    enabled: Boolean(courseId),
  });
  const resourcesQuery = useQuery({
    queryKey: ['resources'],
    queryFn: resourcesService.list,
    enabled: Boolean(courseId),
  });
  const gapsQuery = useQuery({
    queryKey: ['gaps-prioritized'],
    queryFn: knowledgeService.prioritizedGaps,
    enabled: Boolean(courseId),
  });

  if (courseQuery.isLoading) {
    return <p className="text-sm text-slate-500">Cargando el curso…</p>;
  }

  if (courseQuery.error instanceof ApiError && courseQuery.error.status === 404) {
    return (
      <EmptyState
        title="No encontrado"
        description="Este curso no existe o no te pertenece."
        action={<ButtonLink to="/courses" variant="secondary">Volver a mis cursos</ButtonLink>}
      />
    );
  }

  if (courseQuery.error || !courseQuery.data) {
    return <Alert variant="error">No se pudo cargar el curso.</Alert>;
  }

  const course = courseQuery.data;
  const courseSchedules = (schedulesQuery.data?.schedules ?? []).filter((item) => item.course_id === course.id);
  const next = findNextClass(courseSchedules);
  const concepts = conceptsQuery.data?.concepts ?? [];
  const mastery = masteryQuery.data?.concepts ?? [];
  const materials = materialsQuery.data?.materials ?? [];
  const practices = practicesQuery.data?.practices ?? [];
  const checkins = checkinsQuery.data?.checkins ?? [];
  const pendingPractice = practices.find((item) => item.status === 'pending' || item.status === 'in_progress');
  const courseGap = (gapsQuery.data?.gaps ?? []).find((gap) => gap.course_id === course.id);
  const canPractice = Boolean(pendingPractice || courseGap);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-slate-500">
          <Link to="/courses" className="hover:underline">
            Mis cursos
          </Link>
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{course.name}</h1>
        {course.professor?.name ? (
          <p className="mt-1 text-sm text-slate-500">{course.professor.name}</p>
        ) : null}
      </header>

      <Tabs tabs={[...TABS]} value={tab} onChange={(id) => setParams(id === 'resumen' ? {} : { tab: id })} />

      {tab === 'resumen' ? (
        <ResumenTab
          next={next}
          courseId={course.id}
          concepts={concepts}
          mastery={mastery}
          materials={materials}
          practices={practices}
          checkins={checkins}
          canPractice={canPractice}
        />
      ) : null}
      {tab === 'clases' ? (
        <ClasesTab
          courseId={course.id}
          schedules={courseSchedules}
          weekSessions={(weekQuery.data?.schedules ?? []).filter((item) => item.course_id === course.id)}
          checkins={checkins}
        />
      ) : null}
      {tab === 'materiales' ? (
        <MaterialesTab
          courseId={course.id}
          materials={materials}
          resources={resourcesQuery.data?.resources ?? []}
          conceptNames={concepts.map((item) => item.name)}
        />
      ) : null}
      {tab === 'practica' ? (
        <PracticaTab
          practices={practices}
          courseId={course.id}
          conceptId={params.get('concept')}
          gapId={courseGap?.id}
        />
      ) : null}
      {tab === 'progreso' ? <ProgresoTab concepts={concepts} mastery={mastery} /> : null}
    </div>
  );
}

function ResumenTab({
  next,
  courseId,
  concepts,
  mastery,
  materials,
  practices,
  checkins,
  canPractice,
}: {
  next: ReturnType<typeof findNextClass>;
  courseId: string;
  concepts: Concept[];
  mastery: ConceptMastery[];
  materials: Material[];
  practices: PracticeItem[];
  checkins: Checkin[];
  canPractice: boolean;
}) {
  const masteryById = new Map(mastery.map((item) => [item.concept_id, item.mastery_percentage]));
  const weekCheckins = checkins.filter(
    (item) => item.status === 'completed' && isInCurrentWeek(item.class_date),
  );
  const weekPractices = practices.filter((item) => item.status === 'completed');

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Próxima clase</h2>
        {next ? (
          <>
            <p className="mt-2 text-lg font-semibold text-slate-900">{formatClassWhen(next.startsAt)}</p>
            <p className="text-sm text-slate-500">
              {formatClock(next.schedule.start_time)} – {formatClock(next.schedule.end_time)}
            </p>
            <ButtonLink to={`/tutor?course=${courseId}`} className="mt-4">
              Prepararme
            </ButtonLink>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-600">Este curso aún no tiene una próxima clase en el horario.</p>
            <ButtonLink to={`/courses/${courseId}?tab=clases`} variant="secondary" className="mt-4">
              Agregar horario
            </ButtonLink>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Lo que estás aprendiendo</h2>
        {concepts.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">
            Todavía no hay temas registrados. Aparecerán después de un check-in o de practicar.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {concepts.map((concept) => {
              const value = masteryById.get(concept.id);
              return (
                <li key={concept.id}>
                  {value != null ? (
                    <ProgressBar value={value} label={concept.name} />
                  ) : (
                    <p className="text-sm text-slate-700">{concept.name}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Documentos del curso</h2>
        {materials.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Aún no hay documentos. Puedes subirlos ahora o más tarde.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {materials.slice(0, 4).map((material) => (
              <li key={material.id}>{materialLabel(material)}</li>
            ))}
          </ul>
        )}
        <ButtonLink to={`/courses/${courseId}?tab=materiales`} variant="secondary" className="mt-4">
          Agregar o editar documentos
        </ButtonLink>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Práctica</h2>
        <p className="mt-2 text-sm text-slate-600">
          {practices.length > 0
            ? `${practices.length} ${practices.length === 1 ? 'práctica disponible' : 'prácticas disponibles'}.`
            : 'Todavía no hay una práctica creada a partir de lo visto en clase.'}
        </p>
        {canPractice ? (
          <ButtonLink to={`/courses/${courseId}?tab=practica`} className="mt-4">
            Empezar práctica
          </ButtonLink>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Tu progreso</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">Clases esta semana</dt>
            <dd className="mt-1 text-lg font-semibold text-slate-900">{weekCheckins.length}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Prácticas</dt>
            <dd className="mt-1 text-lg font-semibold text-slate-900">{weekPractices.length}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function ClasesTab({
  courseId,
  schedules,
  weekSessions,
  checkins,
}: {
  courseId: string;
  schedules: Schedule[];
  weekSessions: { id: string; date: string; start_time: string; end_time: string }[];
  checkins: Checkin[];
}) {
  return (
    <div className="space-y-4">
      <CourseScheduleEditor courseId={courseId} schedules={schedules} />

      {weekSessions.length === 0 ? (
        schedules.length > 0 ? (
          <EmptyState
            title="No hay sesiones esta semana"
            description="Igual puedes registrar cómo te fue en la última clase."
            action={<ButtonLink to={`/courses/${courseId}/checkin`}>Registrar check-in</ButtonLink>}
          />
        ) : null
      ) : (
        <ul className="space-y-3">
          {weekSessions.map((session) => {
            const checkin = checkins.find((item) => item.class_date === session.date);
            const checkinHref = `/courses/${courseId}/checkin?date=${session.date}&schedule=${session.id}`;
            return (
              <li key={`${session.id}-${session.date}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">{session.date}</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {formatClock(session.start_time)} – {formatClock(session.end_time)}
                </p>
                {checkin?.comprehension_level != null ? (
                  <p className="mt-2 text-sm text-slate-600">Comprensión: {checkin.comprehension_level}/5</p>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Todavía no registraste cómo te fue.</p>
                )}
                <div className="mt-4">
                  <ButtonLink to={checkinHref} variant={checkin?.status === 'completed' ? 'secondary' : 'primary'}>
                    {checkin?.status === 'completed' ? 'Revisar clase' : 'Registrar check-in'}
                  </ButtonLink>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function MaterialesTab({
  courseId,
  materials,
  resources,
  conceptNames,
}: {
  courseId: string;
  materials: Material[];
  resources: RecommendedResource[];
  conceptNames: string[];
}) {
  const recommended = resources.filter((resource) => {
    if (conceptNames.length === 0) return false;
    const haystack = `${resource.title} ${resourceTopics(resource.topics).join(' ')}`.toLowerCase();
    return conceptNames.some((name) => haystack.includes(name.toLowerCase()));
  });

  return (
    <div className="space-y-4">
      <CourseDocuments courseId={courseId} materials={materials} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Recomendado por Academic Copilot
        </h2>
        {recommended.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            Todavía no hay recursos recomendados ligados a los temas de este curso.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {recommended.map((resource) => (
              <li key={resource.id}>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-indigo-700 hover:underline"
                >
                  {resource.title}
                </a>
                {resource.recommendation_reason ? (
                  <p className="text-sm text-slate-500">{resource.recommendation_reason}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PracticaTab({
  practices,
  courseId,
  conceptId,
  gapId,
}: {
  practices: PracticeItem[];
  courseId: string;
  conceptId: string | null;
  gapId?: string;
}) {
  const queryClient = useQueryClient();
  const generate = useMutation({
    mutationFn: () =>
      practiceService.generate({
        course_id: courseId,
        concept_id: conceptId ?? undefined,
        gap_id: conceptId ? undefined : gapId,
        exercise_count: 5,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['practices', courseId] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">Esta práctica se crea a partir de lo visto en tu clase.</p>
        <Button
          loading={generate.isPending}
          onClick={() => generate.mutate()}
        >
          Generar práctica
        </Button>
      </div>
      {generate.isPending ? <Alert variant="info">Generando a partir de lo visto en clase…</Alert> : null}
      {generate.isSuccess && generate.data?.practice.id ? (
        <Alert variant="info">
          Práctica lista. El generador aún es provisional.{' '}
          <ButtonLink to={`/practice/${generate.data.practice.id}`}>Empezar</ButtonLink>
        </Alert>
      ) : null}
      {generate.error ? <Alert variant="error">{generate.error.message}</Alert> : null}

      {practices.length === 0 && !generate.isSuccess ? (
        <EmptyState
          title="Todavía no hay práctica de este curso"
          description="Las prácticas se crean a partir de lo visto en clase y de lo que te cuesta. No inventamos un banco genérico."
        />
      ) : (
        <ul className="space-y-3">
          {practices.map((practice) => (
            <li key={practice.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-semibold text-slate-900">{practice.title}</p>
              <p className="mt-1 text-sm text-slate-500">{PRACTICE_STATUS[practice.status] ?? practice.status}</p>
              {practice.score != null ? (
                <p className="mt-1 text-sm text-slate-600">Resultado: {Math.round(practice.score)}%</p>
              ) : null}
              <ButtonLink to={`/practice/${practice.id}`} variant="secondary" className="mt-3">
                {practice.status === 'completed' ? 'Revisar' : 'Continuar'}
              </ButtonLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProgresoTab({ concepts, mastery }: { concepts: Concept[]; mastery: ConceptMastery[] }) {
  const masteryById = new Map(mastery.map((item) => [item.concept_id, item.mastery_percentage]));
  const items = concepts.length > 0 ? concepts : mastery.map((item) => ({ id: item.concept_id, name: item.name, course_id: item.course_id }));

  if (items.length === 0) {
    return (
      <EmptyState
        title="Aún no hay dominio medido"
        description="Cuando practiques o completes un check-in, verás el avance por tema."
      />
    );
  }

  const overall =
    mastery.length > 0
      ? Math.round(mastery.reduce((sum, item) => sum + item.mastery_percentage, 0) / mastery.length)
      : null;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {overall != null ? <ProgressBar value={overall} label="Dominio general" /> : null}
      <ul className="space-y-3">
        {items.map((item) => {
          const value = masteryById.get(item.id);
          return (
            <li key={item.id}>
              {value != null ? <ProgressBar value={value} label={item.name} /> : <p className="text-sm text-slate-700">{item.name}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function materialLabel(material: Material): string {
  const kind = MATERIAL_LABELS[material.category] ?? 'Material';
  return `${kind} · ${material.title}`;
}
