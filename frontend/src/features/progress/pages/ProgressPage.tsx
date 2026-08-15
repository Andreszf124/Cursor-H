import { useQuery } from '@tanstack/react-query';
import { Alert } from '../../../components/feedback/Alert';
import { ButtonLink } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { knowledgeService } from '../../learning/services/learningService';
import { progressService } from '../services/progressService';

export function ProgressPage() {
  const overviewQuery = useQuery({
    queryKey: ['progress-overview'],
    queryFn: progressService.overview,
  });
  const conceptsQuery = useQuery({
    queryKey: ['progress-concepts'],
    queryFn: () => progressService.byConcept(),
  });
  const gapsQuery = useQuery({
    queryKey: ['gaps-prioritized'],
    queryFn: knowledgeService.prioritizedGaps,
  });

  if (overviewQuery.isLoading || conceptsQuery.isLoading) {
    return <p className="text-sm text-slate-500">Cargando tu progreso…</p>;
  }

  if (overviewQuery.error || conceptsQuery.error) {
    return <Alert variant="error">No se pudo cargar el progreso.</Alert>;
  }

  const overview = overviewQuery.data;
  const concepts = conceptsQuery.data?.concepts ?? [];
  const gap = gapsQuery.data?.gaps[0];
  const hasMastery = (overview?.concepts_tracked ?? 0) > 0 && concepts.length > 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Progreso</h1>
        <p className="mt-1 text-sm text-slate-500">Cómo vas, en lenguaje claro. Sin tablas técnicas.</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Dominio general</h2>
        {hasMastery ? (
          <div className="mt-4">
            <ProgressBar value={overview?.average_mastery ?? 0} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">Aún no hay suficiente evidencia para estimar tu dominio.</p>
        )}
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">Check-ins</dt>
            <dd className="mt-1 font-semibold text-slate-900">{overview?.checkins_completed ?? 0}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Prácticas</dt>
            <dd className="mt-1 font-semibold text-slate-900">{overview?.practices_completed ?? 0}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Temas por reforzar</dt>
            <dd className="mt-1 font-semibold text-slate-900">{overview?.active_gaps ?? 0}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Temas</h2>
        {concepts.length === 0 ? (
          <EmptyState
            title="Todavía no hay temas medidos"
            description="Practica o registra una clase para ver el avance por concepto."
          />
        ) : (
          <ul className="mt-4 space-y-3">
            {concepts.map((concept) => (
              <li key={concept.concept_id}>
                <ProgressBar value={concept.mastery_percentage} label={concept.name} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {gap?.concept?.name ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Área de atención</h2>
          <p className="mt-3 text-lg font-semibold text-slate-900">{gap.concept.name}</p>
          <p className="mt-1 text-sm text-slate-600">Conviene reforzar este tema antes de la siguiente clase.</p>
          <ButtonLink
            to={gap.course_id ? `/courses/${gap.course_id}?tab=practica` : '/courses'}
            className="mt-4"
          >
            Practicar
          </ButtonLink>
        </section>
      ) : null}
    </div>
  );
}
