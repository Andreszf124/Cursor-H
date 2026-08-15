import { useQuery } from '@tanstack/react-query';
import { Alert } from '../../../components/feedback/Alert';
import { ButtonLink } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { knowledgeService, practiceService, checkinsService } from '../../learning/services/learningService';
import { profileService } from '../../profile/services/profileService';
import { progressService } from '../../progress/services/progressService';
import {
  findEndedToday,
  findNextClass,
  firstName,
  formatClassWhen,
  formatClock,
  formatCountdown,
  greetingFor,
  toISODate,
} from '../../schedule/lib/nextClass';
import { scheduleService } from '../../schedule/services/scheduleService';
import { useAuthStore } from '../../../stores/authStore';

export function HomePage() {
  const email = useAuthStore((state) => state.user?.email);
  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: profileService.getProfile });
  const schedulesQuery = useQuery({
    queryKey: ['schedules'],
    queryFn: scheduleService.listSchedules,
  });
  const gapsQuery = useQuery({
    queryKey: ['gaps-prioritized'],
    queryFn: knowledgeService.prioritizedGaps,
  });
  const overviewQuery = useQuery({
    queryKey: ['progress-overview'],
    queryFn: progressService.overview,
  });
  const masteryQuery = useQuery({
    queryKey: ['progress-concepts'],
    queryFn: () => progressService.byConcept(),
  });
  const practicesQuery = useQuery({
    queryKey: ['practices'],
    queryFn: () => practiceService.list(),
  });
  const checkinsQuery = useQuery({
    queryKey: ['checkins'],
    queryFn: () => checkinsService.list(),
  });

  const name = firstName(profileQuery.data?.full_name, email?.split('@')[0] ?? 'estudiante');
  const next = findNextClass(schedulesQuery.data?.schedules ?? []);
  const endedToday = findEndedToday(schedulesQuery.data?.schedules ?? []);
  const endedCourseId = endedToday?.schedule.course_id;
  const endedCourseName = endedToday?.schedule.course?.name ?? 'tu clase';
  const endedCheckedIn = (checkinsQuery.data?.checkins ?? []).some(
    (item) =>
      item.course_id === endedCourseId &&
      item.class_date === toISODate(new Date()) &&
      item.status === 'completed',
  );
  const nextCourseId = next?.schedule.course_id;
  const nextCourseName = next?.schedule.course?.name ?? 'tu próxima clase';
  const gap = gapsQuery.data?.gaps[0];
  const gapName = gap?.concept?.name;
  const gapMastery = masteryQuery.data?.concepts.find((item) => item.concept_id === gap?.concept_id);
  const overview = overviewQuery.data;
  const continuePractice = (practicesQuery.data?.practices ?? []).find(
    (item) => item.status === 'pending' || item.status === 'in_progress',
  );
  const hasTrackedProgress = (overview?.concepts_tracked ?? 0) > 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">
          {greetingFor()}, {name}
        </h1>
      </header>

      {schedulesQuery.error || gapsQuery.error || overviewQuery.error ? (
        <Alert variant="error">No se pudo cargar tu resumen. Intenta de nuevo.</Alert>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Hoy</h2>
        {schedulesQuery.isLoading ? (
          <p className="mt-3 text-sm text-slate-500">Cargando tu horario…</p>
        ) : (
          <>
            {endedToday && endedCourseId && !endedCheckedIn ? (
              <div className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                <p className="font-medium text-indigo-900">¿Cómo te fue en {endedCourseName}?</p>
                <p className="mt-1 text-sm text-indigo-800">La clase ya terminó. Registra qué comprendiste.</p>
                <ButtonLink
                  to={`/courses/${endedCourseId}/checkin?date=${toISODate(new Date())}&schedule=${endedToday.schedule.id}`}
                  className="mt-3"
                >
                  Registrar check-in
                </ButtonLink>
              </div>
            ) : null}
            {next ? (
              <>
                <p className="mt-3 text-lg font-semibold text-slate-900">{nextCourseName}</p>
                <p className="mt-1 text-sm text-slate-600">{formatClassWhen(next.startsAt)}</p>
                {formatCountdown(next.startsAt) ? (
                  <p className="mt-1 text-sm text-indigo-700">
                    Próxima clase {formatCountdown(next.startsAt)} · {formatClock(next.schedule.start_time)} –{' '}
                    {formatClock(next.schedule.end_time)}
                  </p>
                ) : null}
                <ButtonLink to={`/courses/${nextCourseId}`} className="mt-4">
                  Prepararme para la clase
                </ButtonLink>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-600">No tienes clases programadas en los próximos días.</p>
            )}
          </>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Te recomendamos estudiar
        </h2>
        {gapsQuery.isLoading ? (
          <p className="mt-3 text-sm text-slate-500">Buscando qué reforzar…</p>
        ) : gap && gapName ? (
          <>
            <p className="mt-3 text-lg font-semibold text-slate-900">{gapName}</p>
            {gapMastery ? (
              <p className="mt-1 text-sm text-slate-600">
                Has demostrado un dominio del {Math.round(gapMastery.mastery_percentage)}%.
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-600">Según tu última evidencia, conviene reforzar este tema.</p>
            )}
            <ButtonLink
              to={gap.course_id ? `/courses/${gap.course_id}?tab=practica` : '/courses'}
              className="mt-4"
            >
              Practicar
            </ButtonLink>
          </>
        ) : (
          <EmptyState
            title="Todavía no hay un tema para reforzar"
            description="Completa un check-in después de clase para que podamos recomendarte con evidencia."
          />
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Continúa estudiando</h2>
        {overviewQuery.isLoading || practicesQuery.isLoading ? (
          <p className="mt-3 text-sm text-slate-500">Cargando tu avance…</p>
        ) : continuePractice ? (
          <>
            <p className="mt-3 text-lg font-semibold text-slate-900">{continuePractice.title}</p>
            {hasTrackedProgress ? (
              <div className="mt-3">
                <ProgressBar value={overview?.average_mastery ?? 0} label="Dominio general" />
              </div>
            ) : null}
            <ButtonLink
              to={
                continuePractice.course_id
                  ? `/courses/${continuePractice.course_id}?tab=practica`
                  : '/practice'
              }
              className="mt-4"
            >
              Continuar
            </ButtonLink>
          </>
        ) : hasTrackedProgress ? (
          <>
            <p className="mt-3 text-sm text-slate-600">Así vas en general.</p>
            <div className="mt-3">
              <ProgressBar value={overview?.average_mastery ?? 0} label="Dominio general" />
            </div>
            <ButtonLink to="/progress" variant="secondary" className="mt-4">
              Ver progreso
            </ButtonLink>
          </>
        ) : (
          <EmptyState
            title="Aún no medimos tu dominio"
            description="Cuando practiques o registres una clase, aquí verás por dónde continuar."
            action={<ButtonLink to="/courses" variant="secondary">Ir a mis cursos</ButtonLink>}
          />
        )}
      </section>
    </div>
  );
}
