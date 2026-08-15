import { createHash } from 'node:crypto';
import type { z } from 'zod';
import { getAIProvider } from '../../infrastructure/ai/provider.js';
import { retrieveChunks } from '../../infrastructure/ai/rag.service.js';
import { createUserClient } from '../../infrastructure/database/supabase.client.js';
import { AppError, NotFoundError, ValidationError } from '../../shared/errors/app-error.js';
import { knowledgeService } from '../knowledge/knowledge.service.js';
import type { generatePracticeSchema, submitExerciseSchema } from './practice.schemas.js';

type GeneratePractice = z.infer<typeof generatePracticeSchema>;
type SubmitExercise = z.infer<typeof submitExerciseSchema>;

type Difficulty = 'easy' | 'medium' | 'hard';

/** Campos públicos: la solución no sale del servidor hasta el intento. */
function toPublicExercise(exercise: Record<string, unknown>) {
  return {
    id: exercise.id,
    position: exercise.position,
    statement: exercise.statement,
    options: exercise.options ?? null,
    difficulty: exercise.difficulty,
  };
}

/** RF-120 — a mayor brecha, ejercicios más simples para reconstruir la base */
function difficultyForSeverity(severity: string): Difficulty {
  if (severity === 'critical') return 'easy';
  if (severity === 'high') return 'easy';
  if (severity === 'medium') return 'medium';
  return 'hard';
}

/** RF-123 — huella del enunciado normalizado para no repetir ejercicios */
function contentHash(statement: string): string {
  return createHash('sha256')
    .update(statement.toLowerCase().replace(/\s+/g, ' ').trim())
    .digest('hex');
}

export class PracticeService {
  /** RF-116–121 — genera la práctica a partir de la brecha, el concepto o el curso */
  async generate(token: string, userId: string, input: GeneratePractice) {
    const supabase = createUserClient(token);
    const topics = [...(input.topics ?? [])];

    let gap: Record<string, unknown> | null = null;
    if (input.gap_id) {
      gap = await knowledgeService.getGap(token, userId, input.gap_id);
    } else if (!input.concept_id && topics.length === 0 && !input.course_id) {
      const [top] = await knowledgeService.prioritizedGaps(token, userId, 1);
      gap = top ?? null;
    }

    let conceptId = input.concept_id ?? (gap?.concept_id as string | undefined);
    if (!conceptId && topics.length === 0 && input.course_id) {
      topics.push(...(await this.topicsFromLastCheckin(token, userId, input.course_id)));
    }
    if (!conceptId && topics[0]) {
      const fromTopic = await knowledgeService.ensureConcept(token, userId, topics[0], {
        course_id: input.course_id ?? null,
        source: 'checkin',
      });
      conceptId = fromTopic.id as string;
    }
    if (!conceptId && input.course_id) {
      const courseName = await this.courseName(token, userId, input.course_id);
      if (courseName) {
        const fromCourse = await knowledgeService.ensureConcept(token, userId, courseName, {
          course_id: input.course_id,
          source: 'checkin',
        });
        conceptId = fromCourse.id as string;
      }
    }
    if (!conceptId) {
      throw new ValidationError('No hay un tema de clase para armar la práctica');
    }

    const concept = await knowledgeService.getConcept(token, userId, conceptId);
    const severity = (gap?.severity as string | undefined) ?? 'medium';
    const difficulty = input.difficulty ?? difficultyForSeverity(severity);

    const ragQuery = [String(concept.name), ...topics].join(' ');
    const chunks = await retrieveChunks(token, userId, ragQuery, 3);
    const context = [
      `Concepto: ${String(concept.name)}`,
      topics.length > 0 ? `Temas de la clase:\n${topics.join('\n')}` : '',
      chunks.length > 0 ? `Material del curso:\n${chunks.map((c) => c.content).join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const { data: practice, error: practiceError } = await supabase
      .from('practices')
      .insert({
        student_id: userId,
        course_id: input.course_id ?? (gap?.course_id as string | null) ?? null,
        concept_id: conceptId,
        gap_id: (gap?.id as string | undefined) ?? null,
        title: `Práctica: ${String(concept.name)}`,
        difficulty,
        status: 'pending',
      })
      .select('*')
      .single();
    if (practiceError || !practice) {
      throw new AppError('No se pudo crear la práctica', 500, 'DB_ERROR');
    }

    const generated = await getAIProvider().generateQuestions(context, input.exercise_count);
    const { data: existingHashes } = await supabase
      .from('exercises')
      .select('content_hash')
      .eq('student_id', userId);
    const taken = new Set(
      ((existingHashes ?? []) as { content_hash: string }[]).map((row) => row.content_hash),
    );

    const rows = generated
      .map((question, index) => {
        let statement = question.question;
        let hash = contentHash(statement);
        let variant = 2;
        while (taken.has(hash)) {
          statement = `${question.question} (variante ${variant})`;
          hash = contentHash(statement);
          variant += 1;
        }
        taken.add(hash);
        return {
          practice_id: practice.id,
          student_id: userId,
          position: index,
          statement,
          options: question.options ?? null,
          correct_answer: question.answer ?? null,
          solution: question.answer ? `Respuesta esperada: ${question.answer}` : null,
          difficulty,
          content_hash: hash,
        };
      })
      .filter((row, index, all) => all.findIndex((item) => item.content_hash === row.content_hash) === index);

    if (rows.length === 0) {
      return { practice, exercises: [] };
    }

    const { data: exercises, error } = await supabase
      .from('exercises')
      .insert(rows)
      .select('id, position, statement, options, difficulty');
    if (error) throw new AppError('No se pudieron crear los ejercicios', 500, 'DB_ERROR');

    return {
      practice,
      exercises: ((exercises ?? []) as Record<string, unknown>[]).map(toPublicExercise),
    };
  }

  private async courseName(token: string, userId: string, courseId: string): Promise<string | null> {
    const supabase = createUserClient(token);
    const { data } = await supabase
      .from('courses')
      .select('name')
      .eq('id', courseId)
      .eq('student_id', userId)
      .maybeSingle();
    const name = (data as { name?: string } | null)?.name?.trim();
    return name || null;
  }

  private async topicsFromLastCheckin(
    token: string,
    userId: string,
    courseId: string,
  ): Promise<string[]> {
    const supabase = createUserClient(token);
    const { data: checkins } = await supabase
      .from('checkins')
      .select('id')
      .eq('student_id', userId)
      .eq('course_id', courseId)
      .neq('status', 'skipped')
      .order('class_date', { ascending: false })
      .limit(1);
    const checkinId = (checkins as { id: string }[] | null)?.[0]?.id;
    if (!checkinId) return [];
    const { data: topicRows } = await supabase
      .from('checkin_topics')
      .select('topic')
      .eq('checkin_id', checkinId)
      .eq('student_id', userId);
    return ((topicRows ?? []) as { topic: string }[])
      .map((row) => row.topic.trim())
      .filter(Boolean);
  }

  async list(token: string, userId: string, courseId?: string) {
    const supabase = createUserClient(token);
    let query = supabase.from('practices').select('*').eq('student_id', userId);
    if (courseId) query = query.eq('course_id', courseId);

    const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
    if (error) throw new AppError('No se pudieron listar prácticas', 500, 'DB_ERROR');
    const rows = (data ?? []) as { concept_id?: string | null }[];
    const concepts = await knowledgeService.conceptsById(
      token,
      userId,
      rows.map((row) => row.concept_id),
    );
    return rows.map((row) => ({
      ...row,
      concept: row.concept_id ? (concepts.get(row.concept_id) ?? null) : null,
    }));
  }

  async get(token: string, userId: string, id: string) {
    const supabase = createUserClient(token);
    const { data } = await supabase
      .from('practices')
      .select('*')
      .eq('id', id)
      .eq('student_id', userId)
      .maybeSingle();
    if (!data) throw new NotFoundError('Práctica no encontrada');

    const concepts = await knowledgeService.conceptsById(token, userId, [data.concept_id]);
    const { data: exercises } = await supabase
      .from('exercises')
      .select('id, position, statement, options, difficulty')
      .eq('practice_id', id)
      .eq('student_id', userId)
      .order('position');

    const { data: attempts } = await supabase
      .from('exercise_attempts')
      .select('exercise_id, answer, is_correct, score, feedback, time_spent_seconds, created_at')
      .eq('practice_id', id)
      .eq('student_id', userId)
      .order('created_at', { ascending: false });

    const latestAttempt = new Map<string, Record<string, unknown>>();
    for (const attempt of (attempts ?? []) as Record<string, unknown>[]) {
      const exerciseId = String(attempt.exercise_id);
      if (!latestAttempt.has(exerciseId)) latestAttempt.set(exerciseId, attempt);
    }

    return {
      ...data,
      concept: data.concept_id ? (concepts.get(String(data.concept_id)) ?? null) : null,
      exercises: ((exercises ?? []) as Record<string, unknown>[]).map((exercise) => ({
        ...toPublicExercise(exercise),
        last_attempt: latestAttempt.get(String(exercise.id)) ?? null,
      })),
    };
  }

  /** RF-122 — evalúa el intento y devuelve feedback explicativo */
  async submitExercise(token: string, userId: string, exerciseId: string, input: SubmitExercise) {
    const supabase = createUserClient(token);
    const { data: exercise } = await supabase
      .from('exercises')
      .select('id, practice_id, statement, correct_answer, solution')
      .eq('id', exerciseId)
      .eq('student_id', userId)
      .maybeSingle();
    if (!exercise) throw new NotFoundError('Ejercicio no encontrado');

    const evaluation = await getAIProvider().evaluateAnswer(
      exercise.statement as string,
      input.answer,
      (exercise.correct_answer as string | null) ?? undefined,
    );

    const { data, error } = await supabase
      .from('exercise_attempts')
      .insert({
        exercise_id: exerciseId,
        practice_id: exercise.practice_id,
        student_id: userId,
        answer: input.answer,
        is_correct: evaluation.correct,
        score: evaluation.score,
        feedback: evaluation.feedback,
        time_spent_seconds: input.time_spent_seconds,
      })
      .select('*')
      .single();
    if (error || !data) throw new AppError('No se pudo registrar el intento', 500, 'DB_ERROR');

    await supabase
      .from('practices')
      .update({ status: 'in_progress' })
      .eq('id', exercise.practice_id as string)
      .eq('student_id', userId);

    return {
      ...data,
      solution: evaluation.correct ? null : ((exercise.solution as string | null) ?? null),
    };
  }

  /** RF-124 — cierra la práctica con el score y actualiza el dominio del concepto */
  async complete(token: string, userId: string, id: string) {
    const practice = await this.get(token, userId, id);
    const supabase = createUserClient(token);

    const { data: attempts } = await supabase
      .from('exercise_attempts')
      .select('score')
      .eq('practice_id', id)
      .eq('student_id', userId);

    const rows = (attempts ?? []) as { score: number | string }[];
    const average =
      rows.length > 0 ? rows.reduce((sum, row) => sum + Number(row.score), 0) / rows.length : 0;
    const score = Math.round(average * 10000) / 100;

    const { data, error } = await supabase
      .from('practices')
      .update({ status: 'completed', score, completed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('student_id', userId)
      .select('*')
      .single();
    if (error || !data) throw new AppError('No se pudo completar la práctica', 500, 'DB_ERROR');

    if (practice.concept_id) {
      try {
        await knowledgeService.recordEvidence(token, userId, {
          concept_id: practice.concept_id as string,
          score: average,
          source: 'practice',
          source_id: id,
        });
      } catch {
        // El cierre de la práctica no depende del recálculo de dominio.
      }
    }

    return data;
  }
}

export const practiceService = new PracticeService();
