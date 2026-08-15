import { createUserClient } from '../../infrastructure/database/supabase.client.js';
import { ValidationError } from '../../shared/errors/app-error.js';
import { knowledgeService } from '../knowledge/knowledge.service.js';
import { practiceService } from '../practice/practice.service.js';
import { listUpcomingSchedules } from '../schedule/schedule.service.js';

interface ScheduleRow {
  id: string;
  course_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  course?: { id?: string; name?: string } | null;
}

interface GapRow {
  id: string;
  concept_id: string;
  severity: string;
  concept?: { name?: string } | null;
}

/** RF-137 — minutos de preparación sugeridos por severidad de brecha */
const PREP_MINUTES: Record<string, number> = {
  critical: 30,
  high: 25,
  medium: 15,
  low: 10,
};

export class PreparationService {
  /** RF-131 — próxima clase del estudiante según el horario semanal */
  private async nextSchedule(token: string, userId: string): Promise<ScheduleRow | null> {
    const supabase = createUserClient(token);
    const { data } = await supabase
      .from('schedules')
      .select('id, course_id, day_of_week, start_time, end_time, course:courses(id, name)')
      .eq('student_id', userId)
      .order('day_of_week')
      .order('start_time');

    const schedules = (data ?? []) as ScheduleRow[];
    if (schedules.length === 0) return null;

    const now = new Date();
    const today = now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes(),
    ).padStart(2, '0')}:00`;

    const upcoming = schedules.find(
      (schedule) =>
        schedule.day_of_week > today ||
        (schedule.day_of_week === today && schedule.start_time > currentTime),
    );
    // Si no queda nada esta semana, la próxima es la primera de la siguiente
    return upcoming ?? schedules[0]!;
  }

  /** RF-131–137 — panel de preparación para la próxima clase */
  async nextClass(token: string, userId: string) {
    const schedule = await this.nextSchedule(token, userId);
    if (!schedule) {
      return {
        next_class: null,
        topics: [],
        gaps: [],
        recommendation: 'Agrega tu horario para recibir preparación antes de cada clase.',
        estimated_prep_minutes: 0,
      };
    }

    const allGaps = (await knowledgeService.prioritizedGaps(token, userId, 20)) as GapRow[];
    const supabase = createUserClient(token);

    // RF-132 — temas de la clase: conceptos ya registrados para ese curso
    const { data: conceptRows } = await supabase
      .from('concepts')
      .select('id, name')
      .eq('student_id', userId)
      .eq('course_id', schedule.course_id)
      .limit(20);
    const concepts = (conceptRows ?? []) as { id: string; name: string }[];
    const conceptIds = new Set(concepts.map((concept) => concept.id));

    // RF-134 — debilidades relevantes: brechas de conceptos de este curso
    const gaps = allGaps.filter((gap) => conceptIds.has(gap.concept_id));
    const relevant = gaps.length > 0 ? gaps : allGaps.slice(0, 3);

    // RF-133 — dominio actual de cada concepto del curso
    const mastery = await Promise.all(
      concepts.slice(0, 10).map(async (concept) => ({
        concept_id: concept.id,
        name: concept.name,
        mastery: await knowledgeService.getMastery(token, userId, concept.id),
      })),
    );

    const estimated = relevant.reduce(
      (sum, gap) => sum + (PREP_MINUTES[gap.severity] ?? 15),
      0,
    );

    return {
      next_class: {
        schedule_id: schedule.id,
        course_id: schedule.course_id,
        course_name: schedule.course?.name ?? null,
        day_of_week: schedule.day_of_week,
        start_time: schedule.start_time,
      },
      topics: concepts,
      mastery,
      gaps: relevant,
      // RF-135
      recommendation:
        relevant.length > 0
          ? `Antes de ${schedule.course?.name ?? 'la clase'}, refuerza: ${relevant
              .slice(0, 3)
              .map((gap) => gap.concept?.name ?? 'concepto pendiente')
              .join(', ')}.`
          : 'Vas al día: repasa tus apuntes 10 minutos antes de entrar.',
      estimated_prep_minutes: Math.min(estimated, 60),
    };
  }

  /** RF-136 — práctica corta enfocada en la brecha más urgente del curso */
  async generatePractice(token: string, userId: string) {
    const preparation = await this.nextClass(token, userId);
    const [gap] = preparation.gaps as GapRow[];
    if (!gap) {
      throw new ValidationError('No hay brechas activas para preparar la próxima clase');
    }
    return practiceService.generate(token, userId, {
      gap_id: gap.id,
      exercise_count: 3,
      course_id: preparation.next_class?.course_id ?? null,
    });
  }

  /** RF-131 — atajo hacia las clases que están por terminar (módulo schedule) */
  async upcomingClasses(token: string, userId: string) {
    return listUpcomingSchedules(token, userId, 60);
  }
}

export const preparationService = new PreparationService();
