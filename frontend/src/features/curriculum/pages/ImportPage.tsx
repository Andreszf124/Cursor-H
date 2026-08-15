import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert } from '../../../components/feedback/Alert';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { curriculumService } from '../services/curriculumService';

export function ImportPage() {
  const queryClient = useQueryClient();
  const [careerId, setCareerId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const importsQuery = useQuery({
    queryKey: ['curriculum-imports'],
    queryFn: curriculumService.listImports,
  });
  const detailQuery = useQuery({
    queryKey: ['curriculum-import', selectedId],
    queryFn: () => curriculumService.getImport(selectedId!),
    enabled: Boolean(selectedId),
  });

  const upload = useMutation({
    mutationFn: () => curriculumService.importPdf(file!, careerId),
    onSuccess: (row) => {
      void queryClient.invalidateQueries({ queryKey: ['curriculum-imports'] });
      setSelectedId(row.id as string);
    },
  });

  const confirm = useMutation({
    mutationFn: (id: string) => curriculumService.confirmImport(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['curriculum-imports'] });
      void queryClient.invalidateQueries({ queryKey: ['academic-history'] });
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Importar plan de estudios</h1>
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Input
          id="career-id"
          label="ID de carrera (UUID)"
          value={careerId}
          onChange={(e) => setCareerId(e.target.value)}
        />
        <input
          type="file"
          accept="application/pdf"
          aria-label="PDF del plan"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {upload.error && <Alert variant="error">{upload.error.message}</Alert>}
        <Button
          loading={upload.isPending}
          disabled={!file || !careerId}
          onClick={() => upload.mutate()}
        >
          Subir PDF
        </Button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Importaciones</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(importsQuery.data?.imports ?? []).map((item) => {
            const row = item as { id: string; status: string };
            return (
              <li key={row.id}>
                <button
                  type="button"
                  className="text-indigo-600 hover:underline"
                  onClick={() => setSelectedId(row.id)}
                >
                  {row.id.slice(0, 8)}… — {row.status}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {detailQuery.data && (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Revisión</h2>
          <pre className="max-h-64 overflow-auto rounded bg-slate-50 p-3 text-xs">
            {JSON.stringify(detailQuery.data.extracted_data, null, 2)}
          </pre>
          {Array.isArray(detailQuery.data.inconsistencies) &&
            detailQuery.data.inconsistencies.length > 0 && (
              <Alert variant="info">
                {detailQuery.data.inconsistencies.length} inconsistencias detectadas
              </Alert>
            )}
          {detailQuery.data.status === 'review' && (
            <Button
              loading={confirm.isPending}
              onClick={() => confirm.mutate(detailQuery.data.id as string)}
            >
              Confirmar y crear materias
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
