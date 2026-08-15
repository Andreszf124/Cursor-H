import { apiFetch } from '../../../services/api/client';

export interface Institution {
  id: string;
  name: string;
  country: string | null;
  is_verified: boolean;
}

export interface AcademicPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface StudentCareer {
  id: string;
  is_active: boolean;
  started_at: string | null;
  expected_graduation: string | null;
  career: {
    id: string;
    institution_id: string;
    name: string;
    degree_level: string;
    total_credits: number | null;
    institution?: Institution | null;
  };
}

export interface AcademicProgress {
  total_subjects: number;
  approved: number;
  failed: number;
  in_progress: number;
  pending: number;
  completion_percentage: number;
  total_credits: number;
  earned_credits: number;
}

export interface HistoryItem {
  subject_id: string;
  code: string | null;
  name: string;
  credits: number;
  status: string;
  grade: string | null;
  completed_at: string | null;
}

export const careerService = {
  listInstitutions(q?: string) {
    const query = q ? `?q=${encodeURIComponent(q)}` : '';
    return apiFetch<{ institutions: Institution[] }>(`/api/v1/institutions${query}`);
  },
  createInstitution(input: { name: string; country?: string }) {
    return apiFetch<Institution>('/api/v1/institutions', { method: 'POST', body: input });
  },
  setupCareer(input: {
    institution_id: string;
    career_name: string;
    degree_level: string;
    started_at?: string;
    expected_graduation?: string;
  }) {
    return apiFetch<StudentCareer>('/api/v1/career/setup', { method: 'POST', body: input });
  },
  getCareer() {
    return apiFetch<{ career: StudentCareer | null }>('/api/v1/career');
  },
  createPeriod(input: {
    name: string;
    start_date: string;
    end_date: string;
    activate?: boolean;
  }) {
    return apiFetch<AcademicPeriod>('/api/v1/academic-periods', { method: 'POST', body: input });
  },
  listPeriods() {
    return apiFetch<{ periods: AcademicPeriod[] }>('/api/v1/academic-periods');
  },
  activatePeriod(id: string) {
    return apiFetch<AcademicPeriod>(`/api/v1/academic-periods/${id}/activate`, {
      method: 'PATCH',
    });
  },
  /** Período interno: el estudiante no elige fechas. */
  async ensureActivePeriod() {
    const { periods } = await this.listPeriods();
    const active = periods.find((period) => period.is_active);
    if (active) return active;
    const now = new Date();
    const year = now.getFullYear();
    const firstHalf = now.getMonth() < 6;
    return this.createPeriod({
      name: `${year}-${firstHalf ? 'I' : 'II'}`,
      start_date: firstHalf ? `${year}-02-01` : `${year}-07-01`,
      end_date: firstHalf ? `${year}-06-30` : `${year}-12-15`,
      activate: true,
    });
  },
  getHistory() {
    return apiFetch<{ history: HistoryItem[] }>('/api/v1/academic-history');
  },
  updateSubjectStatus(id: string, input: { status: string; grade?: string }) {
    return apiFetch(`/api/v1/subjects/${id}/status`, { method: 'POST', body: input });
  },
  getProgress() {
    return apiFetch<AcademicProgress>('/api/v1/academic-progress');
  },
};
