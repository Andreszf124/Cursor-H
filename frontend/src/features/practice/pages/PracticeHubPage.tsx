import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Alert } from '../../../components/feedback/Alert';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { PRACTICE_STATUS, knowledgeService, practiceService } from '../../learning/services/learningService';

export function PracticeHubPage() {
  const [params] = useSearchParams();
  const courseId = params.get('course') ?? undefined;
  const conceptId = params.get('concept') ?? undefined;
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['practices', courseId ?? 'all'],
    queryFn: () => practiceService.list(courseId),
  });
  const gapsQuery = useQuery({
    queryKey: ['gaps-prioritized'],
    queryFn: knowledgeService.prioritizedGaps,
  });

  const generate = useMutation({
    mutationFn: () =>
      practiceService.generate({
        course_id: courseId,
        concept_id: conceptId,
        gap_id: !conceptId
          ? (gapsQuery.data?.gaps.find((gap) => !courseId || gap.course_id === courseId)?.id)
          : undefined,
        exercise_count: 5,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['practices'] });
    },
  });

  const practices = listQuery.data?.practices ?? [];
  const generatedId = generate.data?.practice.id;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Práctica</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ejercicios a partir de tus clases y de lo que te cuesta, no un banco genérico.
          </p>
        </div>
        <Button
          loading={generate.isPending}
          onClick={() => generate.mutate()}
        >
          Generar práctica
        </Button>
      </header>

      {generate.isPending ? (
        <Alert variant="info">Generando a partir de lo visto en clase…</Alert>
      ) : null}
      {generate.isSuccess ? (
        <Alert variant="info">
          Esta práctica se armó con el generador actual. Todavía no hay un modelo de IA conectado; úsala
          para practicar el flujo, no como examen definitivo.{' '}
          {generatedId ? (
            <ButtonLink to={`/practice/${generatedId}`} className="ml-2">
              Abrir
            </ButtonLink>
          ) : null}
        </Alert>
      ) : null}
      {generate.error ? <Alert variant="error">{generate.error.message}</Alert> : null}

      {listQuery.isLoading ? <p className="text-sm text-slate-500">Cargando prácticas…</p> : null}
      {listQuery.error ? <Alert variant="error">{listQuery.error.message}</Alert> : null}

      {!listQuery.isLoading && practices.length === 0 ? (
        <EmptyState
          title="Aún no hay prácticas"
          description="Genera un set cuando tengas un tema de clase o una brecha registrada."
        />
      ) : (
        <ul className="space-y-3">
          {practices.map((practice) => (
            <li key={practice.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-semibold text-slate-900">{practice.title}</p>
              <p className="mt-1 text-sm text-slate-500">
                {PRACTICE_STATUS[practice.status] ?? practice.status}
                {practice.concept?.name ? ` · ${practice.concept.name}` : ''}
              </p>
              <ButtonLink
                to={`/practice/${practice.id}`}
                variant="secondary"
                className="mt-3"
              >
                {practice.status === 'completed' ? 'Revisar' : 'Continuar'}
              </ButtonLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
