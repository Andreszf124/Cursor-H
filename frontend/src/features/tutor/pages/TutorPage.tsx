import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert } from '../../../components/feedback/Alert';
import { Button } from '../../../components/ui/Button';
import { coursesService } from '../../courses/services/coursesService';
import { TUTOR_MODES, TUTOR_SUGGESTIONS, type TutorModeId } from '../lib/modes';
import { tutorService, type TutorMessage } from '../services/tutorService';

function sourceLabel(message: TutorMessage): string | null {
  const titles = [...new Set((message.sources ?? []).map((item) => item.title).filter(Boolean))];
  if (titles.length === 0) return null;
  return titles.join(', ');
}

export function TutorPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const courseId = params.get('course') || null;
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [mode, setMode] = useState<TutorModeId>('explain');
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const coursesQuery = useQuery({
    queryKey: ['courses', 'all'],
    queryFn: () => coursesService.listCourses(),
  });
  const conversationsQuery = useQuery({
    queryKey: ['tutor-conversations'],
    queryFn: tutorService.listConversations,
  });
  const messagesQuery = useQuery({
    queryKey: ['tutor-messages', conversationId],
    queryFn: () => tutorService.listMessages(conversationId ?? ''),
    enabled: Boolean(conversationId),
  });

  const chat = useMutation({
    mutationFn: (message: string) =>
      tutorService.chat({
        conversation_id: conversationId ?? undefined,
        message,
        mode,
        course_id: courseId,
      }),
    onSuccess: (result) => {
      setText('');
      setConversationId(result.conversation_id);
      void queryClient.invalidateQueries({ queryKey: ['tutor-conversations'] });
      void queryClient.invalidateQueries({ queryKey: ['tutor-messages', result.conversation_id] });
    },
  });

  const conversations = conversationsQuery.data?.conversations ?? [];
  const messages = messagesQuery.data?.messages ?? [];
  const courses = coursesQuery.data?.courses ?? [];
  const selectedCourse = courses.find((course) => course.id === courseId);
  const activeConversation = conversations.find((item) => item.id === conversationId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages.length, chat.isPending]);

  const send = (message: string): void => {
    const trimmed = message.trim();
    if (!trimmed || chat.isPending) return;
    chat.mutate(trimmed);
  };

  const chooseCourse = (id: string): void => {
    const next = new URLSearchParams(params);
    if (id) next.set('course', id);
    else next.delete('course');
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tutor IA</h1>
          <p className="mt-1 text-sm text-slate-500">
            Pregunta con el contexto de tus cursos y materiales. Si no hay apuntes indexados, el tutor
            te lo dice en lugar de inventar.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setConversationId(null);
            setText('');
          }}
        >
          Nueva conversación
        </Button>
      </header>

      {chat.error ? <Alert variant="error">{chat.error.message}</Alert> : null}

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <ul className="space-y-1 rounded-2xl border border-slate-200 bg-white p-3">
          {conversationsQuery.isLoading ? (
            <li className="px-2 py-3 text-sm text-slate-500">Cargando consultas…</li>
          ) : null}
          {conversations.length === 0 && !conversationsQuery.isLoading ? (
            <li className="px-2 py-3 text-sm text-slate-500">Aún no hay conversaciones.</li>
          ) : null}
          {conversations.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setConversationId(item.id)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                  conversationId === item.id
                    ? 'bg-indigo-50 font-medium text-indigo-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.title || 'Consulta'}
              </button>
            </li>
          ))}
        </ul>

        <section className="flex min-h-[28rem] flex-col rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-4 py-3">
            <div className="min-w-[12rem] flex-1">
              <label htmlFor="tutor-course" className="block text-sm font-medium text-slate-700">
                Curso
              </label>
              <select
                id="tutor-course"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                value={courseId ?? ''}
                onChange={(event) => chooseCourse(event.target.value)}
              >
                <option value="">Todos mis materiales</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-500">
              {selectedCourse
                ? `Esta consulta se apoya en ${selectedCourse.name}.`
                : activeConversation?.title
                  ? 'Puedes acotar a un curso para no mezclar materias.'
                  : 'Elige un curso si quieres respuestas solo de esa materia.'}
            </p>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {!conversationId && messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  Escribe tu duda o empieza con una de estas preguntas. No hace falta crear una
                  conversación vacía.
                </p>
                <ul className="space-y-2">
                  {TUTOR_SUGGESTIONS.map((item) => (
                    <li key={item.text}>
                      <button
                        type="button"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                        onClick={() => {
                          setMode(item.mode);
                          setText(item.text);
                        }}
                      >
                        {item.text}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {messagesQuery.isLoading ? (
              <p className="text-sm text-slate-500">Cargando mensajes…</p>
            ) : null}

            {messages.map((message) => {
              const fromStudent = message.role === 'user';
              const sources = sourceLabel(message);
              return (
                <article
                  key={message.id}
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    fromStudent
                      ? 'ml-auto bg-indigo-50 text-indigo-950'
                      : 'bg-slate-50 text-slate-800'
                  }`}
                >
                  <p className="text-xs font-medium text-slate-500">
                    {fromStudent ? 'Tú' : 'Tutor'}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
                  {!fromStudent && sources ? (
                    <p className="mt-2 text-xs text-slate-500">Fuentes: {sources}</p>
                  ) : null}
                  {!fromStudent && (message.sources?.length ?? 0) === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Esta respuesta no usó tus materiales.
                    </p>
                  ) : null}
                </article>
              );
            })}

            {chat.isPending ? (
              <p className="text-sm text-slate-500">El tutor está redactando la respuesta…</p>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <form
            className="space-y-3 border-t border-slate-100 px-4 py-3"
            onSubmit={(event) => {
              event.preventDefault();
              send(text);
            }}
          >
            <fieldset>
              <legend className="text-sm font-medium text-slate-700">Cómo quieres la respuesta</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {TUTOR_MODES.map((item) => (
                  <label
                    key={item.id}
                    className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm focus-within:ring-2 focus-within:ring-indigo-300 ${
                      mode === item.id
                        ? 'border-indigo-300 bg-indigo-50 font-medium text-indigo-800'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tutor-mode"
                      value={item.id}
                      checked={mode === item.id}
                      className="sr-only"
                      onChange={() => setMode(item.id)}
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex gap-2">
              <label htmlFor="tutor-message" className="sr-only">
                Tu duda
              </label>
              <textarea
                id="tutor-message"
                rows={2}
                className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                placeholder="Escribe tu duda…"
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    send(text);
                  }
                }}
              />
              <Button type="submit" loading={chat.isPending} disabled={!text.trim()}>
                Enviar
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
