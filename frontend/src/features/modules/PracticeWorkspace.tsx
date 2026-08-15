import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from '../../components/feedback/Alert';
import { Button } from '../../components/ui/Button';
import { apiFetch } from '../../services/api/client';

interface PracticeRow {
  id: string;
  title?: string;
  status?: string;
}

export function PracticeWorkspace() {
  const queryClient = useQueryClient();
  const listQuery = useQuery({
    queryKey: ['practices'],
    queryFn: () => apiFetch<{ practices: PracticeRow[] }>('/api/v1/practice'),
  });
  const generate = useMutation({
    mutationFn: () =>
      apiFetch('/api/v1/practice/generate', {
        method: 'POST',
        body: { exercise_count: 3 },
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['practices'] }),
  });

  const practices = listQuery.data?.practices ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Práctica</h1>
        <Button loading={generate.isPending} onClick={() => generate.mutate()}>
          Generar ejercicios
        </Button>
      </div>
      {generate.error && <Alert variant="error">{generate.error.message}</Alert>}
      {listQuery.isLoading && <p className="text-sm text-slate-500">Cargando…</p>}
      {listQuery.error && <Alert variant="error">{listQuery.error.message}</Alert>}
      {practices.length === 0 && !listQuery.isLoading ? (
        <p className="text-sm text-slate-600">
          Aún no hay prácticas. Genera un set a partir de tus brechas.
        </p>
      ) : (
        <ul className="space-y-2">
          {practices.map((practice) => (
            <li key={practice.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
              <span className="font-medium">{practice.title ?? practice.id.slice(0, 8)}</span>
              {practice.status && <span className="ml-2 text-slate-500">{practice.status}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
