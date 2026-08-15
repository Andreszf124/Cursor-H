import { apiFetch } from '../../../services/api/client';

export type CourseModality = 'in_person' | 'virtual' | 'hybrid';

export interface Professor {
  id: string;
  name: string;
  email: string | null;
}

export interface Course {
  id: string;
  name: string;
  academic_period_id: string;
  subject_id: string | null;
  professor_id: string | null;
  modality: CourseModality;
  color: string | null;
  professor: Professor | null;
}

export const coursesService = {
  listCourses(periodId?: string) {
    const query = periodId ? `?academic_period_id=${encodeURIComponent(periodId)}` : '';
    return apiFetch<{ courses: Course[] }>(`/api/v1/courses${query}`);
  },
  getCourse(id: string) {
    return apiFetch<Course>(`/api/v1/courses/${id}`);
  },
  createCourse(input: {
    name: string;
    academic_period_id: string;
    professor_id?: string | null;
    modality?: CourseModality;
    color?: string | null;
  }) {
    return apiFetch<Course>('/api/v1/courses', { method: 'POST', body: input });
  },
  createProfessor(input: { name: string; email?: string | null }) {
    return apiFetch<Professor>('/api/v1/professors', { method: 'POST', body: input });
  },
};
