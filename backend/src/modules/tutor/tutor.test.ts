import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

const mocks = vi.hoisted(() => ({ getUser: vi.fn() }));

vi.mock('../../infrastructure/database/supabase.client.js', async () => {
  const { createFakeSupabase, testStore } = await import('../../test/fake-supabase.js');
  return {
    getAnonClient: () => ({ auth: { getUser: mocks.getUser } }),
    getServiceClient: () => createFakeSupabase(testStore),
    createUserClient: () => createFakeSupabase(testStore),
  };
});

import { buildApp } from '../../app.js';
import { testStore } from '../../test/fake-supabase.js';

const AUTH = { authorization: 'Bearer valid-token-a' };
const COURSE_ID = '00000000-0000-4000-8000-0000000000f1';
const OTHER_COURSE_ID = '00000000-0000-4000-8000-0000000000f2';
const ALIEN_COURSE_ID = '00000000-0000-4000-8000-0000000000f3';
const MATERIAL_ID = '00000000-0000-4000-8000-0000000000a1';
const OTHER_MATERIAL_ID = '00000000-0000-4000-8000-0000000000a2';
const CHUNK_ID = '00000000-0000-4000-8000-0000000000b1';
const OTHER_CHUNK_ID = '00000000-0000-4000-8000-0000000000b2';

describe('módulo tutor', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    testStore.reset();
    testStore.seed('courses', [
      { id: COURSE_ID, student_id: 'user-a', name: 'Cálculo I', modality: 'in_person' },
      { id: OTHER_COURSE_ID, student_id: 'user-a', name: 'Física I', modality: 'in_person' },
      { id: ALIEN_COURSE_ID, student_id: 'user-b', name: 'Otro', modality: 'in_person' },
    ]);
    mocks.getUser.mockImplementation((token: string) =>
      token === 'valid-token-a'
        ? Promise.resolve({
            data: { user: { id: 'user-a', email: 'a@universidad.edu' } },
            error: null,
          })
        : Promise.resolve({ data: { user: null }, error: { message: 'invalid' } }),
    );
  });

  it('crea la conversación al primer mensaje y no inventa si no hay materiales', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/tutor/chat',
      headers: AUTH,
      payload: { message: '¿Qué es la regla de la cadena?', mode: 'explain', course_id: COURSE_ID },
    });
    expect(response.statusCode).toBe(201);
    const body = response.json<{
      conversation_id: string;
      used_materials: boolean;
      message: { role: string; content: string };
      sources: unknown[];
    }>();
    expect(body.used_materials).toBe(false);
    expect(body.sources).toEqual([]);
    expect(body.message.role).toBe('assistant');
    expect(body.message.content).toMatch(/No tengo material tuyo indexado/);
    expect(body.message.content).not.toMatch(/\[stub\]/);

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/tutor/conversations',
      headers: AUTH,
    });
    expect(list.statusCode).toBe(200);
    const conversations = list.json<{ conversations: { title: string; course_id: string }[] }>()
      .conversations;
    expect(conversations).toHaveLength(1);
    expect(conversations[0]?.title).toContain('regla de la cadena');
    expect(conversations[0]?.course_id).toBe(COURSE_ID);
  });

  it('responde con ejemplos y cita el material del curso, no el de otra materia', async () => {
    testStore.seed('materials', [
      { id: MATERIAL_ID, student_id: 'user-a', course_id: COURSE_ID, title: 'Apuntes clase 5' },
      {
        id: OTHER_MATERIAL_ID,
        student_id: 'user-a',
        course_id: OTHER_COURSE_ID,
        title: 'Guía de física',
      },
    ]);
    testStore.seed('content_chunks', [
      {
        id: CHUNK_ID,
        material_id: MATERIAL_ID,
        student_id: 'user-a',
        content: 'La regla de la cadena dice que la derivada de una composición es el producto de derivadas.',
      },
      {
        id: OTHER_CHUNK_ID,
        material_id: OTHER_MATERIAL_ID,
        student_id: 'user-a',
        content: 'La segunda ley de Newton relaciona fuerza y aceleración.',
      },
    ]);
    testStore.seed('embeddings', [
      { chunk_id: CHUNK_ID, student_id: 'user-a', embedding: [1, 0, 0, 0, 0, 0, 0, 0] },
      { chunk_id: OTHER_CHUNK_ID, student_id: 'user-a', embedding: [0, 1, 0, 0, 0, 0, 0, 0] },
    ]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/tutor/chat',
      headers: AUTH,
      payload: {
        message: 'Necesito un ejemplo de la regla de la cadena',
        mode: 'example',
        course_id: COURSE_ID,
      },
    });
    expect(response.statusCode).toBe(201);
    const body = response.json<{
      conversation_id: string;
      used_materials: boolean;
      message: { content: string };
      sources: { title: string | null }[];
    }>();
    expect(body.used_materials).toBe(true);
    expect(body.sources.map((item) => item.title)).toEqual(['Apuntes clase 5']);
    expect(body.message.content).toMatch(/Según tus apuntes/);
    expect(body.message.content).toMatch(/Ejemplo/);
    expect(body.message.content).not.toMatch(/Newton/);

    const messages = await app.inject({
      method: 'GET',
      url: `/api/v1/tutor/conversations/${body.conversation_id}/messages`,
      headers: AUTH,
    });
    expect(messages.statusCode).toBe(200);
    expect(messages.json<{ messages: unknown[] }>().messages).toHaveLength(2);
  });

  it('no acepta un curso de otro estudiante', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/tutor/chat',
      headers: AUTH,
      payload: { message: 'Hola', course_id: ALIEN_COURSE_ID },
    });
    expect(response.statusCode).toBe(404);
  });

  it('oculta una conversación ajena con 404', async () => {
    testStore.seed('tutor_conversations', [
      { id: '00000000-0000-4000-8000-000000000099', student_id: 'user-b', title: 'Privada' },
    ]);
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/tutor/conversations/00000000-0000-4000-8000-000000000099/messages',
      headers: AUTH,
    });
    expect(response.statusCode).toBe(404);
  });
});
