import { apiFetch } from '../../../services/api/client';
import type { TutorModeId } from '../lib/modes';

export interface TutorConversation {
  id: string;
  title: string;
  course_id: string | null;
}

export interface TutorSource {
  chunk_id: string;
  material_id: string | null;
  title: string | null;
  similarity: number;
}

export interface TutorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: TutorSource[] | null;
}

export interface TutorChatResult {
  conversation_id: string;
  message: TutorMessage;
  sources: TutorSource[];
  used_materials: boolean;
}

export const tutorService = {
  listConversations() {
    return apiFetch<{ conversations: TutorConversation[] }>('/api/v1/tutor/conversations');
  },
  listMessages(conversationId: string) {
    return apiFetch<{ messages: TutorMessage[] }>(
      `/api/v1/tutor/conversations/${conversationId}/messages`,
    );
  },
  chat(input: {
    conversation_id?: string;
    message: string;
    mode: TutorModeId;
    course_id?: string | null;
  }) {
    return apiFetch<TutorChatResult>('/api/v1/tutor/chat', { method: 'POST', body: input });
  },
};
