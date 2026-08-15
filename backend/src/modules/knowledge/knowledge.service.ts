import type { z } from 'zod';
import { createUserClient } from '../../infrastructure/database/supabase.client.js';
import { AppError, NotFoundError } from '../../shared/errors/app-error.js';
import type {
  createConceptSchema,
  createGapSchema,
  GAP_SEVERITIES,
  listConceptsSchema,
  recordMasterySchema,
  updateGapSchema,
} from './knowledge.schemas.js';

type CreateConcept = z.infer<typeof createConceptSchema>;
type ListConcepts = z.infer<typeof listConceptsSchema>;
type CreateGap = z.infer<typeof createGapSchema>;
type UpdateGap = z.infer<typeof updateGapSchema>;
type RecordMastery = z.infer<typeof recordMasterySchema>;
export type GapSeverity = (typeof GAP_SEVERITIES)[number];

/** Peso base de cada severidad al priorizar brechas (RF-095) */
const SEVERITY_WEIGHT: Record<GapSeverity, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
};

/**
 * RF-094 — clasificación de la brecha a partir del dominio del concepto.
 * <30% crítica · <50% alta · <70% media · resto baja.
 */
export function classifySeverity(masteryPercentage: number): GapSeverity {
  if (masteryPercentage < 30) return 'critical';
  if (masteryPercentage < 50) return 'high';
  if (masteryPercentage < 70) return 'medium';
  return 'low';
}

/**
 * RF-095–097 — score de prioridad: severidad + prerrequisito faltante
 * + cercanía de la próxima evaluación (más cerca ⇒ más prioridad).
 */
export function priorityScore(input: {
  severity: GapSeverity;
  prerequisiteMissing: boolean;
  nextAssessmentDate?: string | null;
}): number {
  let score = SEVERITY_WEIGHT[input.severity];
  if (input.prerequisiteMissing) score += 20;

  if (input.nextAssessmentDate) {
    const days = Math.ceil(
      (new Date(input.nextAssessmentDate).getTime() - Date.now()) / 86_400_000,
    );
    if (days <= 0) score += 25;
    else if (days <= 3) score += 20;
    else if (days <= 7) score += 12;
    else if (days <= 14) score += 6;
  }
  return Math.round(score * 100) / 100;
}

export class KnowledgeService {
  async createConcept(token: string, userId: string, input: CreateConcept) {
    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('concepts')
      .insert({ ...input, student_id: userId })
      .select('*')
      .single();
    if (error || !data) throw new AppError('No se pudo crear el concepto', 500, 'DB_ERROR');
    return data;
  }

  async listConcepts(token: string, userId: string, params: ListConcepts) {
    const supabase = createUserClient(token);
    let query = supabase.from('concepts').select('*').eq('student_id', userId);
    if (params.course_id) query = query.eq('course_id', params.course_id);
    if (params.subject_id) query = query.eq('subject_id', params.subject_id);

    const { data, error } = await query.order('name');
    if (error) throw new AppError('No se pudieron listar conceptos', 500, 'DB_ERROR');
    return data ?? [];
  }

  async getConcept(token: string, userId: string, id: string) {
    const supabase = createUserClient(token);
    const { data } = await supabase
      .from('concepts')
      .select('*')
      .eq('id', id)
      .eq('student_id', userId)
      .maybeSingle();
    if (!data) throw new NotFoundError('Concepto no encontrado');
    return data;
  }

  /** Busca el concepto por nombre o lo crea — usado al procesar check-ins */
  async ensureConcept(
    token: string,
    userId: string,
    name: string,
    context: { course_id?: string | null; source?: CreateConcept['source'] } = {},
  ) {
    const supabase = createUserClient(token);
    let query = supabase
      .from('concepts')
      .select('*')
      .eq('student_id', userId)
      .eq('name', name);
    if (context.course_id) query = query.eq('course_id', context.course_id);

    const { data: existing } = await query.limit(1).maybeSingle();
    if (existing) return existing;

    return this.createConcept(token, userId, {
      name,
      description: null,
      subject_id: null,
      course_id: context.course_id ?? null,
      source: context.source ?? 'checkin',
    });
  }

  async conceptsById(token: string, userId: string, ids: unknown[]) {
    const unique = [...new Set(ids.map((id) => String(id ?? '')).filter(Boolean))];
    if (unique.length === 0) {
      return new Map<string, { id: string; name: string; course_id?: string | null; subject_id?: string | null }>();
    }
    const supabase = createUserClient(token);
    const { data } = await supabase
      .from('concepts')
      .select('id, name, course_id, subject_id')
      .eq('student_id', userId)
      .in('id', unique);
    return new Map(
      ((data ?? []) as { id: string; name: string; course_id?: string | null; subject_id?: string | null }[]).map(
        (row) => [row.id, row],
      ),
    );
  }

  /** RF-091, RF-092 — dominio actual del concepto */
  async getMastery(token: string, userId: string, conceptId: string) {
    await this.getConcept(token, userId, conceptId);
    const supabase = createUserClient(token);
    const { data } = await supabase
      .from('concept_mastery')
      .select('*')
      .eq('student_id', userId)
      .eq('concept_id', conceptId)
      .maybeSingle();
    return (
      data ?? {
        student_id: userId,
        concept_id: conceptId,
        mastery_percentage: 0,
        evidence_count: 0,
        last_evaluated_at: null,
      }
    );
  }

  /**
   * RF-098 — media móvil ponderada: la evidencia nueva pesa 40%.
   * Cada llamada deja una fila en mastery_evidence para graficar evolución.
   */
  async recordEvidence(token: string, userId: string, input: RecordMastery) {
    await this.getConcept(token, userId, input.concept_id);
    const supabase = createUserClient(token);
    const current = (await this.getMastery(token, userId, input.concept_id)) as {
      mastery_percentage?: number | string;
      evidence_count?: number;
    };

    const previous = Number(current.mastery_percentage ?? 0);
    const evidenceCount = Number(current.evidence_count ?? 0);
    const incoming = input.score * 100;
    const mastery =
      evidenceCount === 0
        ? Math.round(incoming * 100) / 100
        : Math.round((previous * 0.6 + incoming * 0.4) * 100) / 100;

    const { data, error } = await supabase
      .from('concept_mastery')
      .upsert(
        {
          student_id: userId,
          concept_id: input.concept_id,
          mastery_percentage: mastery,
          evidence_count: evidenceCount + 1,
          last_evaluated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,concept_id' },
      )
      .select('*')
      .single();
    if (error || !data) throw new AppError('No se pudo actualizar el dominio', 500, 'DB_ERROR');

    await supabase.from('mastery_evidence').insert({
      student_id: userId,
      concept_id: input.concept_id,
      source: input.source,
      source_id: input.source_id ?? null,
      score: input.score,
      mastery_after: mastery,
    });

    await this.syncGap(token, userId, input.concept_id, mastery, input.source);
    return data;
  }

  /**
   * RF-093, RF-094 — mantiene la brecha alineada con el dominio:
   * la abre/reclasifica si hay déficit y la cierra al superar el 70%.
   */
  private async syncGap(
    token: string,
    userId: string,
    conceptId: string,
    mastery: number,
    detectedFrom: RecordMastery['source'],
  ): Promise<void> {
    const supabase = createUserClient(token);
    const { data: existing } = await supabase
      .from('knowledge_gaps')
      .select('*')
      .eq('student_id', userId)
      .eq('concept_id', conceptId)
      .maybeSingle();

    if (mastery >= 70) {
      if (existing) {
        await supabase
          .from('knowledge_gaps')
          .update({ status: 'closed', closed_at: new Date().toISOString(), severity: 'low' })
          .eq('id', existing.id as string)
          .eq('student_id', userId);
      }
      return;
    }

    const severity = classifySeverity(mastery);
    const prerequisiteMissing = Boolean(existing?.prerequisite_missing);
    const nextAssessmentDate = (existing?.next_assessment_date as string | null) ?? null;
    const payload = {
      student_id: userId,
      concept_id: conceptId,
      severity,
      prerequisite_missing: prerequisiteMissing,
      next_assessment_date: nextAssessmentDate,
      priority_score: priorityScore({
        severity,
        prerequisiteMissing,
        nextAssessmentDate,
      }),
      status: 'active' as const,
      detected_from: detectedFrom === 'manual' ? 'manual' : detectedFrom,
      closed_at: null,
    };

    await supabase
      .from('knowledge_gaps')
      .upsert(payload, { onConflict: 'student_id,concept_id' });
  }

  async listGaps(token: string, userId: string, status = 'active') {
    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('knowledge_gaps')
      .select('*')
      .eq('student_id', userId)
      .eq('status', status)
      .order('priority_score', { ascending: false });
    if (error) throw new AppError('No se pudieron listar brechas', 500, 'DB_ERROR');
    const rows = (data ?? []) as { concept_id: string }[];
    const concepts = await this.conceptsById(
      token,
      userId,
      rows.map((row) => row.concept_id),
    );
    return rows.map((row) => ({
      ...row,
      concept: concepts.get(row.concept_id) ?? null,
    }));
  }

  /** RF-095 — brechas activas ordenadas por prioridad */
  async prioritizedGaps(token: string, userId: string, limit = 10) {
    const gaps = await this.listGaps(token, userId, 'active');
    return gaps.slice(0, limit);
  }

  async getGap(token: string, userId: string, id: string) {
    const supabase = createUserClient(token);
    const { data } = await supabase
      .from('knowledge_gaps')
      .select('*')
      .eq('id', id)
      .eq('student_id', userId)
      .maybeSingle();
    if (!data) throw new NotFoundError('Brecha no encontrada');
    const concepts = await this.conceptsById(token, userId, [data.concept_id]);
    return {
      ...data,
      concept: concepts.get(String(data.concept_id)) ?? null,
    };
  }

  async createGap(token: string, userId: string, input: CreateGap) {
    await this.getConcept(token, userId, input.concept_id);
    const mastery = (await this.getMastery(token, userId, input.concept_id)) as {
      mastery_percentage?: number | string;
    };
    const severity = input.severity ?? classifySeverity(Number(mastery.mastery_percentage ?? 0));

    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('knowledge_gaps')
      .upsert(
        {
          student_id: userId,
          concept_id: input.concept_id,
          course_id: input.course_id ?? null,
          severity,
          prerequisite_missing: input.prerequisite_missing,
          next_assessment_date: input.next_assessment_date ?? null,
          detected_from: input.detected_from,
          status: 'active',
          priority_score: priorityScore({
            severity,
            prerequisiteMissing: input.prerequisite_missing,
            nextAssessmentDate: input.next_assessment_date ?? null,
          }),
        },
        { onConflict: 'student_id,concept_id' },
      )
      .select('*')
      .single();
    if (error || !data) throw new AppError('No se pudo registrar la brecha', 500, 'DB_ERROR');
    return data;
  }

  async updateGap(token: string, userId: string, id: string, input: UpdateGap) {
    const existing = await this.getGap(token, userId, id);
    const severity = input.severity ?? (existing.severity as GapSeverity);
    const nextAssessmentDate =
      input.next_assessment_date === undefined
        ? ((existing.next_assessment_date as string | null) ?? null)
        : input.next_assessment_date;

    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('knowledge_gaps')
      .update({
        ...input,
        severity,
        next_assessment_date: nextAssessmentDate,
        priority_score: priorityScore({
          severity,
          prerequisiteMissing: Boolean(existing.prerequisite_missing),
          nextAssessmentDate,
        }),
        closed_at: input.status === 'closed' ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .eq('student_id', userId)
      .select('*')
      .single();
    if (error || !data) throw new AppError('No se pudo actualizar la brecha', 500, 'DB_ERROR');
    return data;
  }

  /** RF-098 — serie temporal de evidencias para la gráfica de evolución */
  async masteryEvolution(token: string, userId: string, conceptId?: string) {
    const supabase = createUserClient(token);
    let query = supabase
      .from('mastery_evidence')
      .select('concept_id, score, mastery_after, source, created_at')
      .eq('student_id', userId);
    if (conceptId) query = query.eq('concept_id', conceptId);

    const { data, error } = await query.order('created_at', { ascending: true }).limit(500);
    if (error) throw new AppError('No se pudo obtener la evolución', 500, 'DB_ERROR');
    return data ?? [];
  }
}

export const knowledgeService = new KnowledgeService();
