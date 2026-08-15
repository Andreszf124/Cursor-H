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
   * RF-100–106 — turno de chat con contexto RAG.
   * El retrieval usa el student_id del JWT: nunca material de otro estudiante.
   */
  async chat(token: string, userId: string, input: Chat) {
    const conversation = input.conversation_id
      ? await this.getConversation(token, userId, input.conversation_id)
      : await this.createConversation(token, userId, {
          title: input.message.slice(0, 80),
          course_id: input.course_id ?? null,
          concept_id: null,
        });

    const supabase = createUserClient(token);
    const chunks = await retrieveChunks(token, userId, input.message, 5);

    await supabase.from('tutor_messages').insert({
      conversation_id: conversation.id,
      student_id: userId,
      role: 'user',
      content: input.message,
    });

    const context = chunks.map((chunk, index) => `[${index + 1}] ${chunk.content}`).join('\n');
    const prompt = [
      MODE_INSTRUCTIONS[input.mode],
      context ? `Contexto del material del estudiante:\n${context}` : 'Sin material indexado.',
      `Pregunta: ${input.message}`,
    ].join('\n\n');

    const answer = await getAIProvider().generateText(prompt);
    const sources = chunks.map((chunk) => ({
      chunk_id: chunk.chunk_id,
      material_id: chunk.material_id,
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

    await supabase
      .from('tutor_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversation.id)
      .eq('student_id', userId);

    return { conversation_id: conversation.id, message, sources };
  }

  private async assertCourse(token: string, userId: string, courseId: string): Promise<void> {
    const supabase = createUserClient(token);
    const { data } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .eq('student_id', userId)
      .maybeSingle();
    if (!data) throw new NotFoundError('Curso no encontrado');
  }
}

export const tutorService = new TutorService();
