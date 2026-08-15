import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from '../../../components/feedback/Alert';
import { Button } from '../../../components/ui/Button';
import { careerService } from '../services/careerService';

const STATUS_LABELS: Record<string, string> = {
  approved: 'Aprobada',
  failed: 'Reprobada',
  in_progress: 'En curso',
  pending: 'Pendiente',
};

export function AcademicHistoryPage() {
  const queryClient = useQueryClient();
  const historyQuery = useQuery({
    queryKey: ['academic-history'],
    queryFn: careerService.getHistory,
  });
  const progressQuery = useQuery({
    queryKey: ['academic-progress'],
    queryFn: careerService.getProgress,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      careerService.updateSubjectStatus(id, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['academic-history'] });
      void queryClient.invalidateQueries({ queryKey: ['academic-progress'] });
    },
  });

  if (historyQuery.isLoading || progressQuery.isLoading) {
    return <p className="text-sm text-slate-600">Cargando historial…</p>;
  }

  if (historyQuery.error || progressQuery.error) {
    return <Alert variant="error">No se pudo cargar el historial académico.</Alert>;
  }

  const progress = progressQuery.data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Historial académico</h1>

      {progress && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Avance</h2>
          <p className="mt-2 text-3xl font-semibold text-indigo-600">
            {progress.completion_percentage}%
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {progress.approved} aprobadas · {progress.in_progress} en curso · {progress.pending}{' '}
            pendientes · {progress.earned_credits}/{progress.total_credits} créditos
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Materias</h2>
        {(historyQuery.data?.history.length ?? 0) === 0 ? (
          <p className="mt-2 text-sm text-slate-600">
            Aún no hay materias. Importa un plan de estudios o créalas manualmente.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {historyQuery.data?.history.map((item) => (
              <li key={item.subject_id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-medium text-slate-900">
                    {item.code ? `${item.code} · ` : ''}
                    {item.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {item.credits} créditos · {STATUS_LABELS[item.status] ?? item.status}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      updateStatus.mutate({ id: item.subject_id, status: 'approved' })
                    }
                  >
                    Aprobar
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => updateStatus.mutate({ id: item.subject_id, status: 'failed' })}
                  >
                    Reprobar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
