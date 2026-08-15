import type { z } from 'zod';
import { getAIProvider } from '../../infrastructure/ai/provider.js';
import { createUserClient } from '../../infrastructure/database/supabase.client.js';
import { AppError, NotFoundError } from '../../shared/errors/app-error.js';
import { knowledgeService } from '../knowledge/knowledge.service.js';
import type { askSchema, registerVideoSchema } from './classes.schemas.js';

type RegisterVideo = z.infer<typeof registerVideoSchema>;
type Ask = z.infer<typeof askSchema>;

const SEGMENT_CHARS = 400;
/** Ritmo de habla aproximado para estimar el timestamp de cada segmento */
const CHARS_PER_SECOND = 15;

interface SegmentRow {
  segment_index: number;
  start_seconds: number;
  end_seconds: number;
  content: string;
}

function buildSegments(text: string): SegmentRow[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const segments: SegmentRow[] = [];
  for (let offset = 0; offset < normalized.length; offset += SEGMENT_CHARS) {
    const content = normalized.slice(offset, offset + SEGMENT_CHARS);
    const index = segments.length;
    segments.push({
      segment_index: index,
      start_seconds: Math.round((offset / CHARS_PER_SECOND) * 1000) / 1000,
      end_seconds: Math.round(((offset + content.length) / CHARS_PER_SECOND) * 1000) / 1000,
      content,
    });
  }
  return segments.slice(0, 200);
}

export class ClassesService {
  /** RF-061–067 — registra el video/transcripción de una clase del curso */
  async registerVideo(token: string, userId: string, courseId: string, input: RegisterVideo) {
    const supabase = createUserClient(token);
    const { data: course } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .eq('student_id', userId)
      .maybeSingle();
    if (!course) throw new NotFoundError('Curso no encontrado');

    const hasText = Boolean(input.transcript_text?.trim());
    let summary: string | null = null;
    let topics: unknown = null;
    if (hasText) {
      try {
        const analysis = await getAIProvider().analyzeContent(
          input.transcript_text ?? '',
          'class_transcript',
        );
        summary = typeof analysis.summary === 'string' ? analysis.summary : null;
        topics = analysis.keywords ?? null;
      } catch {
        summary = null;
      }
    }

    const { data: transcript, error } = await supabase
      .from('transcripts')
      .insert({
        student_id: userId,
        course_id: courseId,
        material_id: input.material_id ?? null,
        source: input.source,
        language: input.language,
        full_text: input.transcript_text ?? null,
        duration_seconds: input.duration_seconds ?? null,
        status: hasText ? 'completed' : 'pending',
        summary,
        topics,
      })
      .select('*')
      .single();
    if (error || !transcript) {
      throw new AppError('No se pudo registrar la clase', 500, 'DB_ERROR');
    }

    if (hasText) {
      const segments = buildSegments(input.transcript_text ?? '');
      if (segments.length > 0) {
        await supabase.from('transcript_segments').insert(
          segments.map((segment) => ({
            ...segment,
            transcript_id: transcript.id,
            student_id: userId,
          })),
        );
      }
      await this.registerConcepts(token, userId, courseId, topics);
    }

    return transcript;
  }

  /** RF-064, RF-065 — los temas detectados se vuelven conceptos rastreables */
  private async registerConcepts(
    token: string,
    userId: string,
    courseId: string,
    topics: unknown,
  ): Promise<void> {
    if (!Array.isArray(topics)) return;
    for (const topic of topics.slice(0, 8)) {
      try {
        await knowledgeService.ensureConcept(token, userId, String(topic), {
          course_id: courseId,
          source: 'transcript',
        });
      } catch {
        // Un concepto duplicado o inválido no debe invalidar el registro.
      }
    }
  }

  async list(token: string, userId: string, courseId?: string) {
    const supabase = createUserClient(token);
    let query = supabase
      .from('transcripts')
      .select('id, course_id, status, language, summary, topics, created_at')
      .eq('student_id', userId);
    if (courseId) query = query.eq('course_id', courseId);

    const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
    if (error) throw new AppError('No se pudieron listar las clases', 500, 'DB_ERROR');
    return data ?? [];
  }

  async getTranscript(token: string, userId: string, id: string) {
    const supabase = createUserClient(token);
    const { data } = await supabase
      .from('transcripts')
      .select('*')
      .eq('id', id)
      .eq('student_id', userId)
      .maybeSingle();
    if (!data) throw new NotFoundError('Transcripción no encontrada');

    const { data: segments } = await supabase
      .from('transcript_segments')
      .select('segment_index, start_seconds, end_seconds, content')
      .eq('transcript_id', id)
      .eq('student_id', userId)
      .order('segment_index');

    return { ...data, segments: segments ?? [] };
  }

  /** RF-064, RF-071, RF-072 */
  async topics(token: string, userId: string, id: string) {
    const transcript = await this.getTranscript(token, userId, id);
    return { topics: transcript.topics ?? [] };
  }

  /** RF-065 — conceptos del curso alimentados por esta clase */
  async concepts(token: string, userId: string, id: string) {
    const transcript = await this.getTranscript(token, userId, id);
    const concepts = await knowledgeService.listConcepts(token, userId, {
      course_id: (transcript.course_id as string | null) ?? undefined,
    });
    return { concepts };
  }

  /** RF-066, RF-067 */
  async summary(token: string, userId: string, id: string) {
    const transcript = await this.getTranscript(token, userId, id);
    return {
      summary: transcript.summary ?? null,
      keywords: transcript.topics ?? [],
      duration_seconds: transcript.duration_seconds ?? null,
    };
  }

  /** RF-068, RF-070 — primer segmento donde aparece el concepto */
  async conceptTimestamp(token: string, userId: string, id: string, concept: string) {
    const transcript = await this.getTranscript(token, userId, id);
    const segments = transcript.segments as SegmentRow[];
    const needle = concept.toLowerCase();
    const match = segments.find((segment) => segment.content.toLowerCase().includes(needle));
    if (!match) throw new NotFoundError('Concepto no encontrado en la transcripción');
    return {
      concept,
      start_seconds: match.start_seconds,
      end_seconds: match.end_seconds,
      excerpt: match.content,
    };
  }

  /** RF-069 — pregunta sobre la clase usando la transcripción como contexto */
  async ask(token: string, userId: string, id: string, input: Ask) {
    const transcript = await this.getTranscript(token, userId, id);
    const context = String(transcript.full_text ?? '').slice(0, 4000);
    const answer = await getAIProvider().generateText(
      `Contexto de la clase:\n${context}\n\nPregunta: ${input.question}`,
    );
    return { question: input.question, answer, transcript_id: id };
  }
}

export const classesService = new ClassesService();
