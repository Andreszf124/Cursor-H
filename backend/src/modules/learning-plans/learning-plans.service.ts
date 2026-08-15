import type { z } from 'zod';
import { createUserClient } from '../../infrastructure/database/supabase.client.js';
import { AppError, NotFoundError } from '../../shared/errors/app-error.js';
import { knowledgeService } from '../knowledge/knowledge.service.js';
import type { generatePlanSchema } from './learning-plans.schemas.js';

type GeneratePlan = z.infer<typeof generatePlanSchema>;

type Technique = 'active_recall' | 'spaced_repetition' | 'feynman' | 'practice' | 'reading';

/** RF-111 — técnica recomendada según la severidad de la brecha */
const TECHNIQUE_BY_SEVERITY: Record<string, Technique> = {
  critical: 'reading',
  high: 'feynman',
  medium: 'active_recall',
  low: 'spaced_repetition',
};

/** RF-113 — duración estimada por severidad, en minutos */
const MINUTES_BY_SEVERITY: Record<string, number> = {
  critical: 30,
  high: 25,
  medium: 20,
  low: 15,
};

interface GapRow {
  id: string;
  concept_id: string;
  severity: string;
  priority_score: number | string;
  concept?: { id?: string; name?: string } | null;
}

export class LearningPlansService {
  /** RF-107–113 — arma el plan con las brechas priorizadas que caben en el tiempo */
  async generate(token: string, userId: string, input: GeneratePlan) {
    const gaps = (await knowledgeService.prioritizedGaps(token, userId, 10)) as GapRow[];
    const supabase = createUserClient(token);

    const { data: plan, error: planError } = await supabase
      .from('learning_plans')
      .insert({
        student_id: userId,
        course_id: input.course_id ?? null,
        title: input.title ?? 'Plan de estudio',
        available_minutes: input.available_minutes,
        next_class_at: input.next_class_at ?? null,
        status: 'active',
        generated_from: { gaps: gaps.map((gap) => gap.id) },
      })
      .select('*')
      .single();
    if (planError || !plan) {
      throw new AppError('No se pudo crear el plan', 500, 'DB_ERROR');
    }

    let remaining = input.available_minutes;
    const rows: Record<string, unknown>[] = [];
    for (const gap of gaps) {
      const minutes = MINUTES_BY_SEVERITY[gap.severity] ?? 20;
      if (minutes > remaining) continue;
      remaining -= minutes;
      const name = gap.concept?.name ?? 'concepto';
      rows.push({
        plan_id: plan.id,
        student_id: userId,
        concept_id: gap.concept_id,
        position: rows.length,
        title: `Repasar ${name}`,
        description: `Brecha ${gap.severity}: refuerza ${name} antes de la próxima clase.`,
        technique: TECHNIQUE_BY_SEVERITY[gap.severity] ?? 'active_recall',
        estimated_minutes: minutes,
        status: 'pending',
      });
    }

    // Sin brechas activas: se propone un repaso general que use el tiempo disponible
    if (rows.length === 0) {
      rows.push({
        plan_id: plan.id,
        student_id: userId,
        concept_id: null,
        position: 0,
        title: 'Repaso general del curso',
        description: 'No hay brechas activas: consolida lo aprendido con recuerdo activo.',
        technique: 'active_recall',
        estimated_minutes: Math.min(input.available_minutes, 30),
        status: 'pending',
      });
    }

    const { data: activities, error } = await supabase
      .from('learning_activities')
      .insert(rows)
      .select('*');
    if (error) throw new AppError('No se pudieron crear las actividades', 500, 'DB_ERROR');

    return { plan, activities: activities ?? [] };
  }

  async listPlans(token: string, userId: string) {
    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('learning_plans')
      .select('*')
      .eq('student_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw new AppError('No se pudieron listar planes', 500, 'DB_ERROR');
    return data ?? [];
  }

  /** RF-112 — plan activo más reciente con sus actividades */
  async active(token: string, userId: string) {
    const supabase = createUserClient(token);
    const { data: plan } = await supabase
      .from('learning_plans')
      .select('*')
      .eq('student_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!plan) return { plan: null, activities: [] };

    const { data: activities } = await supabase
      .from('learning_activities')
      .select('*')
      .eq('plan_id', plan.id as string)
      .eq('student_id', userId)
      .order('position');
    return { plan, activities: activities ?? [] };
  }

  /** RF-114 */
  async completeActivity(token: string, userId: string, activityId: string) {
    const supabase = createUserClient(token);
    const { data: existing } = await supabase
      .from('learning_activities')
      .select('id, plan_id')
      .eq('id', activityId)
      .eq('student_id', userId)
      .maybeSingle();
    if (!existing) throw new NotFoundError('Actividad no encontrada');

    const { data, error } = await supabase
      .from('learning_activities')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', activityId)
      .eq('student_id', userId)
      .select('*')
      .single();
    if (error || !data) throw new AppError('No se pudo completar la actividad', 500, 'DB_ERROR');
    return data;
  }

  /**
   * RF-115 — reajuste: archiva el plan vigente y regenera con las brechas
   * actuales, respetando el tiempo disponible original.
   */
  async adjust(token: string, userId: string, planId: string) {
    const supabase = createUserClient(token);
    const { data: plan } = await supabase
      .from('learning_plans')
      .select('*')
      .eq('id', planId)
      .eq('student_id', userId)
      .maybeSingle();
    if (!plan) throw new NotFoundError('Plan no encontrado');

    await supabase
      .from('learning_plans')
      .update({ status: 'archived' })
      .eq('id', planId)
      .eq('student_id', userId);

    return this.generate(token, userId, {
      course_id: (plan.course_id as string | null) ?? null,
      available_minutes: Number(plan.available_minutes ?? 60),
      next_class_at: (plan.next_class_at as string | null) ?? null,
      title: String(plan.title ?? 'Plan de estudio'),
    });
  }
}

export const learningPlansService = new LearningPlansService();
