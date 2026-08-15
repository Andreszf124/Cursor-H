import { apiFetch } from '../../../services/api/client';

export const curriculumService = {
  listImports: () => apiFetch<{ imports: unknown[] }>('/api/v1/curriculum/imports'),
  getImport: (id: string) => apiFetch<Record<string, unknown>>(`/api/v1/curriculum/imports/${id}`),
  confirmImport: (id: string) =>
    apiFetch(`/api/v1/curriculum/imports/${id}/confirm`, { method: 'POST' }),
  listSubjects: () => apiFetch<{ subjects: unknown[] }>('/api/v1/subjects'),
  async importPdf(file: File, careerId: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('career_id', careerId);
    return apiFetch<Record<string, unknown>>('/api/v1/curriculum/import', {
      method: 'POST',
      formData,
    });
  },
};
