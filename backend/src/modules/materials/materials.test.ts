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
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

interface MultipartField {
  name: string;
  value?: string;
  filename?: string;
  contentType?: string;
  content?: Buffer;
}

function multipartPayload(fields: MultipartField[]): {
  payload: Buffer;
  headers: Record<string, string>;
} {
  const boundary = 'X-TEST-BOUNDARY';
  const chunks: Buffer[] = [];

  for (const field of fields) {
    if (field.content) {
      chunks.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${field.name}"; filename="${field.filename ?? 'file'}"\r\nContent-Type: ${field.contentType ?? 'application/octet-stream'}\r\n\r\n`,
        ),
        field.content,
        Buffer.from('\r\n'),
      );
    } else {
      chunks.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${field.name}"\r\n\r\n${field.value ?? ''}\r\n`,
        ),
      );
    }
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return {
    payload: Buffer.concat(chunks),
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
  };
}

describe('módulo materials', () => {
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
      { id: COURSE_ID, student_id: 'user-a', name: 'Cálculo I' },
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

  it('asocia el documento al curso aunque el archivo vaya antes que course_id', async () => {
    const { payload, headers } = multipartPayload([
      {
        name: 'file',
        filename: 'apuntes.png',
        contentType: 'image/png',
        content: PNG_BYTES,
      },
      { name: 'course_id', value: COURSE_ID },
      { name: 'title', value: 'Apuntes semana 1' },
    ]);

    const uploadRes = await app.inject({
      method: 'POST',
      url: '/api/v1/materials',
      headers: { ...AUTH, ...headers },
      payload,
    });
    expect(uploadRes.statusCode).toBe(201);
    expect(uploadRes.json<{ course_id: string; title: string }>()).toMatchObject({
      course_id: COURSE_ID,
      title: 'Apuntes semana 1',
    });

    const listRes = await app.inject({
      method: 'GET',
      url: `/api/v1/materials?course_id=${COURSE_ID}`,
      headers: AUTH,
    });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json<{ materials: { title: string }[] }>().materials).toEqual([
      expect.objectContaining({ title: 'Apuntes semana 1', course_id: COURSE_ID }),
    ]);
  });
});
