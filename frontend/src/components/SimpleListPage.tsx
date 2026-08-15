import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../services/api/client';
import { Alert } from './feedback/Alert';

interface SimpleListPageProps {
  title: string;
  queryKey: string;
  path: string;
  dataKey?: string;
  emptyText: string;
}

export function SimpleListPage({
  title,
  queryKey,
  path,
  dataKey,
  emptyText,
}: SimpleListPageProps) {
  const query = useQuery({
    queryKey: [queryKey],
    queryFn: () => apiFetch<unknown>(path),
  });

  if (query.isLoading) return <p className="text-sm text-slate-600">Cargando…</p>;
  if (query.error) return <Alert variant="error">{(query.error as Error).message}</Alert>;

  const payload = query.data;
  const items = dataKey
    ? ((payload as Record<string, unknown>)?.[dataKey] ?? null)
    : payload;

  const isEmpty =
    items == null ||
    (Array.isArray(items) && items.length === 0) ||
    (typeof items === 'string' && items.length === 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      {isEmpty ? (
        <p className="text-sm text-slate-600">{emptyText}</p>
      ) : (
        <pre className="overflow-auto rounded-2xl border border-slate-200 bg-white p-4 text-xs">
          {JSON.stringify(dataKey ? items : payload, null, 2)}
        </pre>
      )}
    </div>
  );
}
