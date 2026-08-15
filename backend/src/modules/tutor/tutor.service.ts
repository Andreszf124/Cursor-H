import type { z } from 'zod';
import { getAIProvider } from '../../infrastructure/ai/provider.js';
import { retrieveChunks } from '../../infrastructure/ai/rag.service.js';
import { createUserClient } from '../../infrastructure/database/supabase.client.js';
import { AppError, NotFoundError } from '../../shared/errors/app-error.js';
import type { chatSchema, createConversationSchema, TUTOR_MODES } from './tutor.schemas.js';

type CreateConversation = z.infer<typeof createConversationSchema>;
type Chat = z.infer<typeof chatSchema>;
type TutorMode = (typeof TUTOR_MODES)[number];

const MODE_INSTRUCTIONS: Record<TutorMode, string> = {
  explain: 'Explica el concepto paso a paso, con lenguaje claro.',
  rephrase: 'Explícalo de otra forma, más simple que la anterior.',
  example: 'Responde con ejemplos concretos y resueltos.',
  analogy: 'Responde con una analogía cotidiana antes de la definición formal.',
  error: 'Identifica el error del estudiante y explica por qué ocurre.',
};

const DEFAULT_TITLES = new Set(['Nueva conversación', 'Nueva consulta']);
const HISTORY_LIMIT = 8;

interface HistoryMessage {
  role: string;
  content: string;
}

function conversationTitleFromMessage(message: string): string {
  const compact = message.replace(/\s+/g, ' ').trim();
  return compact.slice(0, 80) || 'Nueva conversación';
}

export function buildTutorPrompt(input: {
  mode: TutorMode;
  courseName: string | null;
  chunks: Array<{ title: string | null; content: string }>;
  history: HistoryMessage[];
  question: string;
}): string {
  const materials =
    input.chunks.length === 0
      ? 'Materiales del estudiante: ninguno.'
      : [
          'Materiales del estudiante:',
          ...input.chunks.map((chunk, index) => {
            const label = chunk.title ? `${chunk.title}` : 'Material';
            return `[${index + 1}] (${label}) ${chunk.content}`;
          }),
        ].join('\n');

  const history =
    input.history.length === 0
      ? 'Historial: vacío.'
      : [
          'Historial reciente:',
          ...input.history.map((item) => {
            const who = item.role === 'user' ? 'Estudiante' : 'Tutor';
            return `${who}: ${item.content}`;
          }),
        ].join('\n');

  return [
    'Eres un tutor académico de Academic Ya!',
    input.courseName ? `Curso: ${input.courseName}.` : 'Curso: no seleccionado.',
    `Modo: ${input.mode}. ${MODE_INSTRUCTIONS[input.mode]}`,
    'Reglas: responde solo con el material del estudiante y conocimiento general mínimo para enlazar ideas.',
    'Si no hay materiales, dilo con claridad y no inventes una explicación como si viniera de sus clases.',
    'No reveles datos de otros estudiantes. Cita el material cuando lo uses.',
    materials,
    history,
    `Pregunta del estudiante: ${input.question}`,
  ].join('\n\n');
}

export class TutorService {
  /** RF-099 */
  async createConversation(token: string, userId: string, input: CreateConversation) {
    const supabase = createUserClient(token);
    if (input.course_id) await this.assertCourse(token, userId, input.course_id);

    const { data, error } = await supabase
      .from('tutor_conversations')
      .insert({
        student_id: userId,
        title: input.title ?? 'Nueva conversación',
        course_id: input.course_id ?? null,
        concept_id: input.concept_id ?? null,
      })
      .select('*')
      .single();
    if (error || !data) throw new AppError('No se pudo crear la conversación', 500, 'DB_ERROR');
    return data;
  }

  async listConversations(token: string, userId: string) {
    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('tutor_conversations')
      .select('*')
      .eq('student_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) throw new AppError('No se pudieron listar conversaciones', 500, 'DB_ERROR');
    return data ?? [];
  }

  async getConversation(token: string, userId: string, id: string) {
    const supabase = createUserClient(token);
    const { data } = await supabase
      .from('tutor_conversations')
      .select('*')
      .eq('id', id)
      .eq('student_id', userId)
      .maybeSingle();
    if (!data) throw new NotFoundError('Conversación no encontrada');
    return data;
  }

  async listMessages(token: string, userId: string, conversationId: string) {
    await this.getConversation(token, userId, conversationId);
    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('tutor_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('student_id', userId)
      .order('created_at');
    if (error) throw new AppError('No se pudieron listar mensajes', 500, 'DB_ERROR');
    return data ?? [];
  }

  /**
   * RF-100–106 — turno de chat con contexto RAG e historial.
   * El retrieval usa el student_id del JWT: nunca material de otro estudiante.
   */
  async chat(token: string, userId: string, input: Chat) {
    if (input.course_id) await this.assertCourse(token, userId, input.course_id);

    const conversation = input.conversation_id
      ? await this.getConversation(token, userId, input.conversation_id)
      : await this.createConversation(token, userId, {
          title: conversationTitleFromMessage(input.message),
          course_id: input.course_id ?? null,
          concept_id: null,
        });

    const courseId = (input.course_id ?? conversation.course_id ?? null) as string | null;
    const courseName = courseId ? await this.courseName(token, userId, courseId) : null;
    const history = ((await this.listMessages(token, userId, conversation.id)) as HistoryMessage[]).slice(
      -HISTORY_LIMIT,
    );
    const chunks = await retrieveChunks(token, userId, input.message, 5, { courseId });

    const supabase = createUserClient(token);
    await supabase.from('tutor_messages').insert({
      conversation_id: conversation.id,
      student_id: userId,
      role: 'user',
      content: input.message,
    });

    const prompt = buildTutorPrompt({
      mode: input.mode,
      courseName,
      chunks,
      history,
      question: input.message,
    });
    const answer = await getAIProvider().generateText(prompt);
    const sources = chunks.map((chunk) => ({
      chunk_id: chunk.chunk_id,
      material_id: chunk.material_id,
      title: chunk.title,
      similarity: Math.round(chunk.similarity * 1000) / 1000,
    }));

    const { data: message, error } = await supabase
      .from('tutor_messages')
      .insert({
        conversation_id: conversation.id,
        student_id: userId,
        role: 'assistant',
        content: answer,
        sources,
      })
      .select('*')
      .single();
    if (error || !message) throw new AppError('No se pudo guardar la respuesta', 500, 'DB_ERROR');

    const nextTitle = DEFAULT_TITLES.has(String(conversation.title ?? ''))
      ? conversationTitleFromMessage(input.message)
      : conversation.title;
    await supabase
      .from('tutor_conversations')
      .update({
        updated_at: new Date().toISOString(),
        title: nextTitle,
        course_id: courseId,
      })
      .eq('id', conversation.id)
      .eq('student_id', userId);

    return {
      conversation_id: conversation.id,
      message,
      sources,
      used_materials: chunks.length > 0,
    };
  }

  private async assertCourse(token: string, userId: string, courseId: string): Promise<void> {
    const course = await this.courseName(token, userId, courseId);
    if (!course) throw new NotFoundError('Curso no encontrado');
  }

  private async courseName(token: string, userId: string, courseId: string): Promise<string | null> {
    const supabase = createUserClient(token);
    const { data } = await supabase
      .from('courses')
      .select('id, name')
      .eq('id', courseId)
      .eq('student_id', userId)
      .maybeSingle();
    if (!data) return null;
    return String((data as { name?: string }).name ?? 'Curso');
  }
}

export const tutorService = new TutorService();
