import { apiFetch } from '../../../services/api/client';

export interface ProgressOverview {
  courses: number;
  materials: number;
  checkins_completed: number;
  practices_completed: number;
  active_gaps: number;
  concepts_tracked: number;
  average_mastery: number;
}

export interface ConceptMastery {
  concept_id: string;
  name: string;
  mastery_percentage: number;
  course_id: string | null;
}

export interface StudyTime {
  exercise_minutes: number;
  checkin_minutes: number;
  total_minutes: number;
  attempts: number;
}

export const progressService = {
  overview() {
    return apiFetch<ProgressOverview>('/api/v1/progress/overview');
  },
  byConcept(courseId?: string) {
    const query = courseId ? `?course_id=${encodeURIComponent(courseId)}` : '';
    return apiFetch<{ concepts: ConceptMastery[] }>(`/api/v1/progress/by-concept${query}`);
  },
  studyTime() {
    return apiFetch<StudyTime>('/api/v1/progress/study-time');
  },
};
