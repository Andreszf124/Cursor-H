import type { z } from 'zod';
import { getAIProvider } from '../../infrastructure/ai/provider.js';
import { createUserClient } from '../../infrastructure/database/supabase.client.js';
import { AppError, NotFoundError, ValidationError } from '../../shared/errors/app-error.js';
import { knowledgeService } from '../knowledge/knowledge.service.js';
import type {
  comprehensionSchema,
  createCheckinSchema,
  generateDiagnosticSchema,
  listCheckinsSchema,
  recordTopicsSchema,
  submitDiagnosticSchema,
} from './checkins.schemas.js';

type CreateCheckin = z.infer<typeof createCheckinSchema>;
type ListCheckins = z.infer<typeof listCheckinsSchema>;
type RecordTopics = z.infer<typeof recordTopicsSchema>;
type Comprehension = z.infer<typeof comprehensionSchema>;
type GenerateDiagnostic = z.infer<typeof generateDiagnosticSchema>;
type SubmitDiagnostic = z.infer<typeof submitDiagnosticSchema>;

interface QuestionRow {
  id: string;
  question: string;
  expected_answer: string | null;
  topic: string | null;
}

export class CheckinsService {
  /** RF-081, RF-083 — abre el check-in de una clase del estudiante */
  async create(token: string, userId: string, input: CreateCheckin) {
    const supabase = createUserClient(token);
    const { data: course } = await supabase
      .from('courses')
      .select('id')
      .eq('id', input.course_id)
      .eq('student_id', userId)
      .maybeSingle();
    if (!course) throw new NotFoundError('Curso no encontrado');

    const { data, error } = await supabase
      .from('checkins')
      .insert({
        student_id: userId,
        course_id: input.course_id,
        schedule_id: input.schedule_id ?? null,
        class_date: input.class_date ?? new Date().toISOString().slice(0, 10),
        status: 'pending',
      })
      .select('*')
      .single();
    if (error || !data) throw new AppError('No se pudo crear el check-in', 500, 'DB_ERROR');
    return data;
  }

  async list(token: string, userId: string, params: ListCheckins) {
    const supabase = createUserClient(token);
    let query = supabase
      .from('checkins')
      .select('*, course:courses(id, name)')
      .eq('student_id', userId);
    if (params.status) query = query.eq('status', params.status);
    if (params.course_id) query = query.eq('course_id', params.course_id);

    const { data, error } = await query.order('class_date', { ascending: false }).limit(100);
    if (error) throw new AppError('No se pudieron listar check-ins', 500, 'DB_ERROR');
    return data ?? [];
  }

  async get(token: string, userId: string, id: string) {
    const supabase = createUserClient(token);
    const { data } = await supabase
      .from('checkins')
      .select('*, course:courses(id, name)')
      .eq('id', id)
      .eq('student_id', userId)
      .maybeSingle();
    if (!data) throw new NotFoundError('Check-in no encontrado');

    const { data: topics } = await supabase
      .from('checkin_topics')
      .select('*')
      .eq('checkin_id', id)
      .eq('student_id', userId)
      .order('created_at');

    return { ...data, topics: topics ?? [], suggestions: await this.suggestTopics(token, userId, data.course_id as string) };
  }

  /** RF-085 — sugerencias a partir de los materiales del curso y temas previos */
  async suggestTopics(token: string, userId: string, courseId: string): Promise<string[]> {
    const supabase = createUserClient(token);
    const { data: materials } = await supabase
      .from('materials')
      .select('title, metadata')
      .eq('student_id', userId)
      .eq('course_id', courseId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5);

    const suggestions = new Set<string>();
    for (const material of (materials ?? []) as { title: string; metadata?: unknown }[]) {
      const keywords = (material.metadata as { keywords?: unknown } | null)?.keywords;
      if (Array.isArray(keywords)) {
        for (const keyword of keywords.slice(0, 3)) suggestions.add(String(keyword));
      } else {
        suggestions.add(material.title);
      }
    }
    return [...suggestions].slice(0, 8);
  }

  /** RF-084, RF-086 — reemplaza los temas registrados del check-in */
  async recordTopics(token: string, userId: string, id: string, input: RecordTopics) {
    await this.getRaw(token, userId, id);
    const supabase = createUserClient(token);

    await supabase.from('checkin_topics').delete().eq('checkin_id', id).eq('student_id', userId);
    const { data, error } = await supabase
      .from('checkin_topics')
      .insert(
        input.topics.map((topic) => ({
          checkin_id: id,
          student_id: userId,
          topic,
          origin: input.origin,
          confirmed: true,
        })),
      )
      .select('*');
    if (error) throw new AppError('No se pudieron guardar los temas', 500, 'DB_ERROR');

    await supabase
      .from('checkins')
      .update({ status: 'in_progress' })
      .eq('id', id)
      .eq('student_id', userId);
    return data ?? [];
  }

  /** RF-087, RF-088 — nivel de comprensión y dificultades */
  async recordComprehension(token: string, userId: string, id: string, input: Comprehension) {
    await this.getRaw(token, userId, id);
    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('checkins')
      .update({
        comprehension_level: input.comprehension_level,
        difficulties: input.difficulties ?? null,
        status: 'in_progress',
      })
      .eq('id', id)
      .eq('student_id', userId)
      .select('*')
      .single();
    if (error || !data) throw new AppError('No se pudo guardar la comprensión', 500, 'DB_ERROR');
    return data;
  }

  /**
   * Cierra el check-in sin diagnóstico: convierte temas + comprensión en evidencia
   * de dominio y sugiere qué reforzar.
   */
  async complete(token: string, userId: string, id: string) {
    const checkin = await this.getRaw(token, userId, id);
    const level = Number(checkin.comprehension_level);
    if (!Number.isInteger(level) || level < 1 || level > 5) {
      throw new ValidationError('Indica cuánto comprendiste antes de cerrar el check-in');
    }

    const supabase = createUserClient(token);
    const { data: topicRows } = await supabase
      .from('checkin_topics')
      .select('topic')
      .eq('checkin_id', id)
      .eq('student_id', userId);
    const topics = ((topicRows ?? []) as { topic: string }[]).map((row) => row.topic.trim()).filter(Boolean);
    if (topics.length === 0) {
      throw new ValidationError('Registra al menos un tema antes de cerrar el check-in');
    }

    const difficulties = String(checkin.difficulties ?? '').toLowerCase();
    const reinforce: { concept_id: string; name: string; mastery_percentage: number }[] = [];

    for (const topic of topics) {
      const concept = await knowledgeService.ensureConcept(token, userId, topic, {
        course_id: checkin.course_id as string,
        source: 'checkin',
      });
      const mentioned = difficulties.length > 0 && difficulties.includes(topic.toLowerCase());
      const score = mentioned ? Math.min(level / 5, 0.45) : level / 5;
      await knowledgeService.recordEvidence(token, userId, {
        concept_id: concept.id as string,
        score,
        source: 'checkin',
        source_id: id,
      });
      const mastery = (await knowledgeService.getMastery(token, userId, concept.id as string)) as {
        mastery_percentage?: number | string;
      };
      const masteryPercentage = Number(mastery.mastery_percentage ?? 0);
      if (masteryPercentage < 70 || mentioned || level <= 3) {
        reinforce.push({
          concept_id: concept.id as string,
          name: String(concept.name),
          mastery_percentage: masteryPercentage,
        });
      }
    }

    const { data, error } = await supabase
      .from('checkins')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('student_id', userId)
      .select('*')
      .single();
    if (error || !data) throw new AppError('No se pudo completar el check-in', 500, 'DB_ERROR');

    return { checkin: data, topics, reinforce };
  }

  /** RF-089 — genera el diagnóstico con IA a partir de los temas del check-in */
  async generateDiagnostic(
    token: string,
    userId: string,
    id: string,
    input: GenerateDiagnostic,
  ) {
    const checkin = await this.getRaw(token, userId, id);
    const supabase = createUserClient(token);

    const { data: topicRows } = await supabase
      .from('checkin_topics')
      .select('topic')
      .eq('checkin_id', id)
      .eq('student_id', userId);
    const topics = ((topicRows ?? []) as { topic: string }[]).map((row) => row.topic);
    if (topics.length === 0) {
      throw new ValidationError('Registra al menos un tema antes del diagnóstico');
    }

    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .insert({
        student_id: userId,
        checkin_id: id,
        course_id: checkin.course_id,
        type: 'diagnostic',
        status: 'pending',
      })
      .select('*')
      .single();
    if (assessmentError || !assessment) {
      throw new AppError('No se pudo crear la evaluación', 500, 'DB_ERROR');
    }

    const generated = await getAIProvider().generateQuestions(
      topics.join(', '),
      input.question_count,
    );

    const { data: questions, error } = await supabase
      .from('assessment_questions')
      .insert(
        generated.map((question, index) => ({
          assessment_id: assessment.id,
          student_id: userId,
          position: index,
          question: question.question,
          options: question.options ?? null,
          expected_answer: question.answer ?? null,
          topic: topics[index % topics.length] ?? null,
        })),
      )
      // La respuesta esperada no se devuelve al cliente (SECURITY.md §10)
      .select('id, position, question, options, topic');
    if (error) throw new AppError('No se pudieron crear las preguntas', 500, 'DB_ERROR');

    return { assessment, questions: questions ?? [] };
  }

  /**
   * RF-090 — evalúa las respuestas con IA, guarda el score y actualiza
   * dominio/brechas por tema (la clasificación vive en KnowledgeService).
   */
  async submitDiagnostic(token: string, userId: string, id: string, input: SubmitDiagnostic) {
    const checkin = await this.getRaw(token, userId, id);
    const supabase = createUserClient(token);

    const questionIds = input.responses.map((response) => response.question_id);
    const { data: questionRows } = await supabase
      .from('assessment_questions')
      .select('id, question, expected_answer, topic, assessment_id')
      .eq('student_id', userId)
      .in('id', questionIds);

    const questions = (questionRows ?? []) as (QuestionRow & { assessment_id: string })[];
    if (questions.length === 0) throw new NotFoundError('Preguntas no encontradas');

    const ai = getAIProvider();
    const evaluated: { question_id: string; is_correct: boolean; score: number; feedback: string }[] =
      [];

    for (const response of input.responses) {
      const question = questions.find((row) => row.id === response.question_id);
      if (!question) continue;
      const evaluation = await ai.evaluateAnswer(
        question.question,
        response.answer,
        question.expected_answer ?? undefined,
      );
      evaluated.push({
        question_id: question.id,
        is_correct: evaluation.correct,
        score: evaluation.score,
        feedback: evaluation.feedback,
      });
    }

    const assessmentId = questions[0]!.assessment_id;
    await supabase.from('assessment_responses').insert(
      evaluated.map((item) => {
        const answer =
          input.responses.find((response) => response.question_id === item.question_id)?.answer ??
          '';
        return {
          question_id: item.question_id,
          assessment_id: assessmentId,
          student_id: userId,
          answer,
          is_correct: item.is_correct,
          score: item.score,
          feedback: item.feedback,
        };
      }),
    );

    const total = evaluated.reduce((sum, item) => sum + item.score, 0);
    const score = evaluated.length > 0 ? Math.round((total / evaluated.length) * 10000) / 100 : 0;

    await supabase
      .from('assessments')
      .update({ status: 'completed', score, completed_at: new Date().toISOString() })
      .eq('id', assessmentId)
      .eq('student_id', userId);

    await supabase
      .from('checkins')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('student_id', userId);

    // Cada tema evaluado alimenta el dominio del concepto y su brecha (RF-093, RF-094)
    for (const item of evaluated) {
      const question = questions.find((row) => row.id === item.question_id);
      if (!question?.topic) continue;
      try {
        const concept = await knowledgeService.ensureConcept(token, userId, question.topic, {
          course_id: checkin.course_id as string,
          source: 'checkin',
        });
        await knowledgeService.recordEvidence(token, userId, {
          concept_id: concept.id as string,
          score: item.score,
          source: 'assessment',
          source_id: assessmentId,
        });
      } catch {
        // El diagnóstico no se invalida si falla el registro de una brecha.
      }
    }

    return { score, responses: evaluated };
  }

  private async getRaw(token: string, userId: string, id: string) {
    const supabase = createUserClient(token);
    const { data } = await supabase
      .from('checkins')
      .select('*')
      .eq('id', id)
      .eq('student_id', userId)
      .maybeSingle();
    if (!data) throw new NotFoundError('Check-in no encontrado');
    return data;
  }
}

export const checkinsService = new CheckinsService();
