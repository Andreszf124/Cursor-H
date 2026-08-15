import { apiFetch } from '../../../services/api/client';

export interface KnowledgeGap {
  id: string;
  course_id: string | null;
  concept_id: string;
  severity: string;
  status: string;
  concept?: { id: string; name: string } | null;
}

export interface Concept {
  id: string;
  name: string;
  course_id: string | null;
}

export interface Material {
  id: string;
  title: string;
  category: string;
  mime_type: string | null;
  course_id: string | null;
}

export interface RecommendedResource {
  id: string;
  title: string;
  url: string;
  source_type: string;
  origin: string | null;
  recommendation_reason: string | null;
  topics?: unknown;
}

export interface Checkin {
  id: string;
  course_id: string;
  schedule_id: string | null;
  class_date: string;
  status: string;
  comprehension_level: number | null;
  difficulties: string | null;
  course?: { id: string; name: string } | null;
}

export interface CheckinTopic {
  id: string;
  topic: string;
  origin: string;
  confirmed: boolean;
}

export interface CheckinDetail extends Checkin {
  topics: CheckinTopic[];
  suggestions: string[];
}

export interface ReinforceTopic {
  concept_id: string;
  name: string;
  mastery_percentage: number;
}

export interface PracticeItem {
  id: string;
  course_id: string | null;
  concept_id?: string | null;
  title: string;
  status: string;
  score: number | null;
  created_at?: string;
  completed_at?: string | null;
  concept?: { id: string; name: string } | null;
}

export interface PracticeExercise {
  id: string;
  position: number;
  statement: string;
  options: string[] | null;
  difficulty: string;
  last_attempt?: {
    answer: string;
    is_correct: boolean;
    score: number;
    feedback: string;
    time_spent_seconds: number;
  } | null;
}

export interface PracticeDetail extends PracticeItem {
  exercises: PracticeExercise[];
}

export interface ExerciseAttempt {
  id: string;
  is_correct: boolean;
  score: number;
  feedback: string;
  solution: string | null;
}

export const knowledgeService = {
  prioritizedGaps() {
    return apiFetch<{ gaps: KnowledgeGap[] }>('/api/v1/knowledge-gaps/prioritized');
  },
  listConcepts(courseId: string) {
    return apiFetch<{ concepts: Concept[] }>(
      `/api/v1/concepts?course_id=${encodeURIComponent(courseId)}`,
    );
  },
};

export const materialsService = {
  listByCourse(courseId: string) {
    return apiFetch<{ materials: Material[] }>(
      `/api/v1/materials?course_id=${encodeURIComponent(courseId)}`,
    );
  },
  upload(file: File, input: { course_id: string; title?: string; category?: string }) {
    const formData = new FormData();
    formData.append('course_id', input.course_id);
    if (input.title) formData.append('title', input.title);
    if (input.category) formData.append('category', input.category);
    formData.append('file', file);
    return apiFetch<Material>('/api/v1/materials', { method: 'POST', formData });
  },
  update(id: string, input: { title?: string; category?: string }) {
    return apiFetch<Material>(`/api/v1/materials/${id}`, { method: 'PATCH', body: input });
  },
  remove(id: string) {
    return apiFetch<void>(`/api/v1/materials/${id}`, { method: 'DELETE' });
  },
  signedUrl(id: string) {
    return apiFetch<{ url: string; expires_in: number }>(`/api/v1/materials/${id}/url`);
  },
};

export const resourcesService = {
  list() {
    return apiFetch<{ resources: RecommendedResource[] }>('/api/v1/resources');
  },
};

export const checkinsService = {
  list(courseId?: string) {
    const query = courseId ? `?course_id=${encodeURIComponent(courseId)}` : '';
    return apiFetch<{ checkins: Checkin[] }>(`/api/v1/checkins${query}`);
  },
  listByCourse(courseId: string) {
    return this.list(courseId);
  },
  get(id: string) {
    return apiFetch<CheckinDetail>(`/api/v1/checkins/${id}`);
  },
  create(input: { course_id: string; schedule_id?: string | null; class_date?: string }) {
    return apiFetch<Checkin>('/api/v1/checkins', { method: 'POST', body: input });
  },
  recordTopics(id: string, topics: string[], origin: 'student' | 'suggested' = 'student') {
    return apiFetch<{ topics: CheckinTopic[] }>(`/api/v1/checkins/${id}/topics`, {
      method: 'PATCH',
      body: { topics, origin },
    });
  },
  recordComprehension(id: string, input: { comprehension_level: number; difficulties?: string | null }) {
    return apiFetch<Checkin>(`/api/v1/checkins/${id}/comprehension`, {
      method: 'PATCH',
      body: input,
    });
  },
  complete(id: string) {
    return apiFetch<{ checkin: Checkin; topics: string[]; reinforce: ReinforceTopic[] }>(
      `/api/v1/checkins/${id}/complete`,
      { method: 'POST' },
    );
  },
};

export const practiceService = {
  list(courseId?: string) {
    const query = courseId ? `?course_id=${encodeURIComponent(courseId)}` : '';
    return apiFetch<{ practices: PracticeItem[] }>(`/api/v1/practice${query}`);
  },
  get(id: string) {
    return apiFetch<PracticeDetail>(`/api/v1/practice/${id}`);
  },
  generate(input: {
    course_id?: string | null;
    concept_id?: string;
    gap_id?: string;
    topics?: string[];
    exercise_count?: number;
  }) {
    return apiFetch<{ practice: PracticeItem; exercises: PracticeExercise[] }>('/api/v1/practice/generate', {
      method: 'POST',
      body: { exercise_count: 5, ...input },
    });
  },
  submit(exerciseId: string, input: { answer: string; time_spent_seconds: number }) {
    return apiFetch<ExerciseAttempt>(`/api/v1/practice/exercises/${exerciseId}/submit`, {
      method: 'POST',
      body: input,
    });
  },
  complete(id: string) {
    return apiFetch<PracticeItem>(`/api/v1/practice/${id}/complete`, { method: 'POST' });
  },
};

export const MATERIAL_LABELS: Record<string, string> = {
  slides: 'Presentación',
  notes: 'Apuntes',
  exam: 'Examen',
  book: 'Lectura',
  video: 'Grabación',
  link: 'Enlace',
  other: 'Material',
};

export const PRACTICE_STATUS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  completed: 'Completada',
};

export function resourceTopics(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}
