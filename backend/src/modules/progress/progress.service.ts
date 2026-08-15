import { createUserClient } from '../../infrastructure/database/supabase.client.js';
import { AppError } from '../../shared/errors/app-error.js';
import { knowledgeService } from '../knowledge/knowledge.service.js';

interface MasteryRow {
  mastery_percentage: number | string;
  concept_id: string;
  concept?: {
    id?: string;
    name?: string;
    subject_id?: string | null;
    course_id?: string | null;
  } | null;
}

interface GroupAccumulator {
  key: string;
  label: string;
  total: number;
  count: number;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

function groupBy(
  rows: MasteryRow[],
  keyOf: (row: MasteryRow) => { key: string; label: string } | null,
): { id: string; label: string; mastery_percentage: number; concepts: number }[] {
  const groups = new Map<string, GroupAccumulator>();
  for (const row of rows) {
    const group = keyOf(row);
    if (!group) continue;
    const current = groups.get(group.key) ?? {
      key: group.key,
      label: group.label,
      total: 0,
      count: 0,
    };
    current.total += Number(row.mastery_percentage ?? 0);
    current.count += 1;
    groups.set(group.key, current);
  }
  return [...groups.values()].map((group) => ({
    id: group.key,
    label: group.label,
    mastery_percentage: Math.round((group.total / group.count) * 100) / 100,
    concepts: group.count,
  }));
}

export class ProgressService {
  private async masteryRows(token: string, userId: string): Promise<MasteryRow[]> {
    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('concept_mastery')
      .select('mastery_percentage, concept_id')
      .eq('student_id', userId);
    if (error) throw new AppError('No se pudo obtener el dominio', 500, 'DB_ERROR');
    const rows = (data ?? []) as { mastery_percentage: number | string; concept_id: string }[];
    const concepts = await knowledgeService.conceptsById(
      token,
      userId,
      rows.map((row) => row.concept_id),
    );
    return rows.map((row) => ({
      mastery_percentage: row.mastery_percentage,
      concept_id: row.concept_id,
      concept: concepts.get(row.concept_id) ?? null,
    }));
  }

  private async count(token: string, userId: string, table: string, filters: Record<string, string> = {}) {
    const supabase = createUserClient(token);
    let query = supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('student_id', userId);
    for (const [column, value] of Object.entries(filters)) {
      query = query.eq(column, value);
    }
    const { count } = await query;
    return count ?? 0;
  }

  /** RF-138 — resumen general del estudiante */
  async overview(token: string, userId: string) {
    const rows = await this.masteryRows(token, userId);
    const [courses, materials, checkins, practices, gaps] = await Promise.all([
      this.count(token, userId, 'courses'),
      this.count(token, userId, 'materials'),
      this.count(token, userId, 'checkins', { status: 'completed' }),
      this.count(token, userId, 'practices', { status: 'completed' }),
      this.count(token, userId, 'knowledge_gaps', { status: 'active' }),
    ]);

    return {
      courses,
      materials,
      checkins_completed: checkins,
      practices_completed: practices,
      active_gaps: gaps,
      concepts_tracked: rows.length,
      average_mastery: average(rows.map((row) => Number(row.mastery_percentage ?? 0))),
    };
  }

  /** RF-139 */
  async bySubject(token: string, userId: string) {
    const rows = await this.masteryRows(token, userId);
    return groupBy(rows, (row) =>
      row.concept?.subject_id
        ? { key: row.concept.subject_id, label: row.concept.subject_id }
        : null,
    );
  }

  /** RF-140 */
  async byConcept(token: string, userId: string, courseId?: string) {
    const rows = await this.masteryRows(token, userId);
    return rows
      .filter((row) => !courseId || row.concept?.course_id === courseId)
      .map((row) => ({
        concept_id: row.concept_id,
        name: row.concept?.name ?? row.concept_id,
        mastery_percentage: Number(row.mastery_percentage ?? 0),
        course_id: row.concept?.course_id ?? null,
      }))
      .sort((a, b) => b.mastery_percentage - a.mastery_percentage);
  }

  /** RF-141 */
  async assessments(token: string, userId: string) {
    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('assessments')
      .select('id, type, status, score, completed_at, created_at, course_id')
      .eq('student_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw new AppError('No se pudieron obtener evaluaciones', 500, 'DB_ERROR');
    return data ?? [];
  }

  /** RF-142 */
  async evolution(token: string, userId: string) {
    return knowledgeService.masteryEvolution(token, userId);
  }

  /** RF-143 — asignaturas con menor dominio primero */
  async difficultSubjects(token: string, userId: string, limit = 5) {
    const grouped = await this.bySubject(token, userId);
    return grouped
      .sort((a, b) => a.mastery_percentage - b.mastery_percentage)
      .slice(0, limit);
  }

  /** RF-144 */
  async activities(token: string, userId: string) {
    const supabase = createUserClient(token);
    const [{ data: activities }, { data: practices }] = await Promise.all([
      supabase
        .from('learning_activities')
        .select('id, title, status, estimated_minutes, completed_at')
        .eq('student_id', userId)
        .order('completed_at', { ascending: false })
        .limit(50),
      supabase
        .from('practices')
        .select('id, title, status, score, completed_at')
        .eq('student_id', userId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(50),
    ]);

    const activityRows = (activities ?? []) as { status: string }[];
    return {
      activities: activities ?? [],
      practices: practices ?? [],
      completed_activities: activityRows.filter((row) => row.status === 'completed').length,
      pending_activities: activityRows.filter((row) => row.status === 'pending').length,
    };
  }

  /** RF-145 — tiempo de estudio medido en intentos de ejercicio + check-ins */
  async studyTime(token: string, userId: string) {
    const supabase = createUserClient(token);
    const [{ data: attempts }, { data: checkins }] = await Promise.all([
      supabase
        .from('exercise_attempts')
        .select('time_spent_seconds, created_at')
        .eq('student_id', userId)
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('checkins')
        .select('id, completed_at')
        .eq('student_id', userId)
        .eq('status', 'completed')
        .limit(500),
    ]);

    const attemptRows = (attempts ?? []) as { time_spent_seconds: number | string }[];
    const exerciseSeconds = attemptRows.reduce(
      (sum, row) => sum + Number(row.time_spent_seconds ?? 0),
      0,
    );
    // Cada check-in completado se estima en 5 minutos de estudio dirigido
    const checkinSeconds = (checkins ?? []).length * 300;

    return {
      exercise_minutes: Math.round(exerciseSeconds / 60),
      checkin_minutes: Math.round(checkinSeconds / 60),
      total_minutes: Math.round((exerciseSeconds + checkinSeconds) / 60),
      attempts: attemptRows.length,
    };
  }
}

export const progressService = new ProgressService();
