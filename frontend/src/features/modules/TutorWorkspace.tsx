import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert } from '../../components/feedback/Alert';
import { Button } from '../../components/ui/Button';
import { apiFetch } from '../../services/api/client';

interface Conversation {
  id: string;
  title?: string | null;
}

interface ChatMessage {
  role?: string;
  content?: string;
  message?: string;
}

export function TutorWorkspace() {
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [text, setText] = useState('');

  const conversationsQuery = useQuery({
    queryKey: ['tutor-conversations'],
    queryFn: () => apiFetch<{ conversations: Conversation[] }>('/api/v1/tutor/conversations'),
  });

  const messagesQuery = useQuery({
    queryKey: ['tutor-messages', conversationId],
    queryFn: () =>
      apiFetch<{ messages: ChatMessage[] }>(`/api/v1/tutor/conversations/${conversationId}/messages`),
    enabled: Boolean(conversationId),
  });

  const create = useMutation({
    mutationFn: () =>
      apiFetch<Conversation>('/api/v1/tutor/conversations', {
        method: 'POST',
        body: { title: 'Nueva consulta' },
      }),
    onSuccess: (conversation) => {
      setConversationId(conversation.id);
      void queryClient.invalidateQueries({ queryKey: ['tutor-conversations'] });
    },
  });

  const chat = useMutation({
    mutationFn: () =>
      apiFetch('/api/v1/tutor/chat', {
        method: 'POST',
        body: { conversation_id: conversationId, message: text, mode: 'explain' },
      }),
    onSuccess: () => {
      setText('');
      void queryClient.invalidateQueries({ queryKey: ['tutor-messages', conversationId] });
    },
  });

  const conversations = conversationsQuery.data?.conversations ?? [];
  const messages = messagesQuery.data?.messages ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Tutor IA</h1>
        <Button loading={create.isPending} onClick={() => create.mutate()}>
          Nueva conversación
        </Button>
      </div>
      {(create.error || chat.error) && (
        <Alert variant="error">{(create.error ?? chat.error)?.message}</Alert>
      )}
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <ul className="space-y-1 rounded-2xl border border-slate-200 bg-white p-3">
          {conversations.length === 0 && (
            <li className="px-2 py-3 text-sm text-slate-500">Aún no hay conversaciones.</li>
          )}
          {conversations.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setConversationId(item.id)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                  conversationId === item.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50'
                }`}
              >
                {item.title || item.id.slice(0, 8)}
              </button>
            </li>
          ))}
        </ul>
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-4 max-h-80 space-y-2 overflow-y-auto text-sm">
            {messages.map((message, index) => (
              <p key={index} className="rounded-lg bg-slate-50 px-3 py-2">
                <span className="font-medium">{message.role ?? 'tutor'}: </span>
                {message.content ?? message.message}
              </p>
            ))}
            {!conversationId && (
              <p className="text-slate-500">Crea o elige una conversación para preguntar.</p>
            )}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!conversationId || !text.trim()) return;
              chat.mutate();
            }}
          >
            <input
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Escribe tu duda…"
              value={text}
              disabled={!conversationId}
              onChange={(event) => setText(event.target.value)}
            />
            <Button type="submit" loading={chat.isPending} disabled={!conversationId}>
              Enviar
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
