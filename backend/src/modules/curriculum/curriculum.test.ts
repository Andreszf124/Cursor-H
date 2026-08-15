import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { extractTextFromPdf, isPdfBuffer } from '../../shared/utils/pdf-validation.js';

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
const CAREER_ID = '00000000-0000-4000-8000-0000000000c1';
const OTHER_CAREER_ID = '00000000-0000-4000-8000-0000000000c9';
const IMPORT_ID = '00000000-0000-4000-8000-0000000000e1';
const SUBJECT_ID = '00000000-0000-4000-8000-0000000000a1';
const PREREQ_ID = '00000000-0000-4000-8000-0000000000a2';

const CURRICULUM_PDF = Buffer.from(
  [
    '%PDF-1.7',
    'Plan de estudios Ingenieria',
    'Semestre 1',
    'MAT-101 Calculo I 4',
    'INF-101 Programacion I 4',
    'Semestre 2',
    'MAT-201 Calculo II 4 req: MAT-101',
    '%%EOF',
  ].join('\n'),
  'latin1',
);

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

describe('pdf-validation', () => {
  it('acepta magic bytes PDF', () => {
    const buffer = Buffer.from('%PDF-1.4 fake content for test');
    expect(isPdfBuffer(buffer)).toBe(true);
    expect(extractTextFromPdf(buffer).length).toBeGreaterThan(0);
  });

  it('rechaza no-PDF', () => {
    expect(isPdfBuffer(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
  });
});

describe('módulo curriculum', () => {
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
    // La carrera pertenece al estudiante autenticado
    testStore.seed('student_careers', [
      { id: 'sc-1', student_id: 'user-a', career_id: CAREER_ID, is_active: true },
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

  it('retorna 401 sin token', async () => {
    for (const url of ['/api/v1/curriculum/imports', '/api/v1/subjects']) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode, url).toBe(401);
    }
  });

  it('rechaza un archivo que no es PDF aunque declare application/pdf (RF-021, magic bytes)', async () => {
    const { payload, headers } = multipartPayload([
      { name: 'career_id', value: CAREER_ID },
      { name: 'file', content: PNG_BYTES, filename: 'plan.pdf', contentType: 'application/pdf' },
    ]);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/curriculum/import',
      headers: { ...headers, ...AUTH },
      payload,
    });

    expect(res.statusCode).toBe(400);
    expect(testStore.uploads).toHaveLength(0);
    expect(testStore.rows('curriculum_imports')).toHaveLength(0);
  });

  it('importa el PDF, extrae materias y queda en revisión (RF-022, RF-023)', async () => {
    const { payload, headers } = multipartPayload([
      { name: 'career_id', value: CAREER_ID },
      {
        name: 'file',
        content: CURRICULUM_PDF,
        filename: 'plan.pdf',
        contentType: 'application/pdf',
      },
    ]);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/curriculum/import',
      headers: { ...headers, ...AUTH },
      payload,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json<{
      status: string;
      file_path: string;
      extracted_data: {
        subjects: { code: string; credits: number; semester: number | null }[];
        prerequisites: { subject_code: string; prerequisite_code: string }[];
      };
      inconsistencies: unknown[];
    }>();

    expect(body.status).toBe('review');
    expect(body.file_path).toMatch(/^curriculum\/user-a\/[0-9a-f-]+\.pdf$/);
    expect(body.extracted_data.subjects.map((subject) => subject.code)).toEqual([
      'MAT-101',
      'INF-101',
      'MAT-201',
    ]);
    expect(body.extracted_data.prerequisites).toEqual([
      { subject_code: 'MAT-201', prerequisite_code: 'MAT-101' },
    ]);
    expect(body.inconsistencies).toEqual([]);

    // El archivo va al prefijo del propio usuario y queda traza del job
    expect(testStore.uploads[0]?.path).toMatch(/^user-a\//);
    expect(testStore.uploads[0]?.bucket).toBe('curriculum');
    const job = testStore.rows('processing_jobs')[0];
    expect(job?.student_id).toBe('user-a');
    expect(job?.job_type).toBe('curriculum_import');
    expect(job?.status).toBe('completed');
  });

  it('retorna 404 (nunca 403) si la carrera no es del estudiante', async () => {
    const { payload, headers } = multipartPayload([
      { name: 'career_id', value: OTHER_CAREER_ID },
      {
        name: 'file',
        content: CURRICULUM_PDF,
        filename: 'plan.pdf',
        contentType: 'application/pdf',
      },
    ]);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/curriculum/import',
      headers: { ...headers, ...AUTH },
      payload,
    });

    expect(res.statusCode).toBe(404);
    expect(testStore.uploads).toHaveLength(0);
  });

  it('retorna 404 para una importación de otro estudiante', async () => {
    testStore.seed('curriculum_imports', [
      { id: IMPORT_ID, student_id: 'user-b', career_id: CAREER_ID, status: 'review' },
    ]);

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/curriculum/imports/${IMPORT_ID}`,
      headers: AUTH,
    });

    expect(res.statusCode).toBe(404);
  });

  it('permite corregir la extracción y recalcula inconsistencias (RF-024)', async () => {
    testStore.seed('curriculum_imports', [
      {
        id: IMPORT_ID,
        student_id: 'user-a',
        career_id: CAREER_ID,
        file_path: 'curriculum/user-a/plan.pdf',
        status: 'review',
        extracted_data: { subjects: [], prerequisites: [] },
        inconsistencies: [],
      },
    ]);

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/curriculum/imports/${IMPORT_ID}`,
      headers: AUTH,
      payload: {
        extracted_data: {
          subjects: [
            { code: 'MAT-101', name: 'Cálculo I', credits: 0, semester: null, is_elective: false },
          ],
          prerequisites: [{ subject_code: 'MAT-101', prerequisite_code: 'FIS-999' }],
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ inconsistencies: { type: string }[] }>();
    expect(body.inconsistencies.map((item) => item.type)).toEqual([
      'missing_credits',
      'missing_semester',
      'unknown_prerequisite',
    ]);
  });

  it('confirma la importación creando materias y requisitos (RF-025, RF-026)', async () => {
    testStore.seed('curriculum_imports', [
      {
        id: IMPORT_ID,
        student_id: 'user-a',
        career_id: CAREER_ID,
        file_path: 'curriculum/user-a/plan.pdf',
        status: 'review',
        extracted_data: {
          subjects: [
            { code: 'MAT-101', name: 'Cálculo I', credits: 4, semester: 1, is_elective: false },
            { code: 'MAT-201', name: 'Cálculo II', credits: 4, semester: 2, is_elective: false },
          ],
          prerequisites: [{ subject_code: 'MAT-201', prerequisite_code: 'MAT-101' }],
        },
        inconsistencies: [],
      },
    ]);

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/curriculum/imports/${IMPORT_ID}/confirm`,
      headers: AUTH,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json<{
      created_subjects: number;
      created_prerequisites: number;
      import: { status: string; reviewed_at: string | null };
    }>();
    expect(body.created_subjects).toBe(2);
    expect(body.created_prerequisites).toBe(1);
    expect(body.import.status).toBe('completed');
    expect(body.import.reviewed_at).not.toBeNull();

    const subjects = testStore.rows('subjects');
    expect(subjects).toHaveLength(2);
    expect(subjects.every((subject) => subject.student_id === 'user-a')).toBe(true);
    expect(subjects.every((subject) => subject.source === 'pdf_import')).toBe(true);
    expect(testStore.rows('prerequisites')[0]?.student_id).toBe('user-a');
  });

  it('rechaza confirmar dos veces la misma importación', async () => {
    testStore.seed('curriculum_imports', [
      {
        id: IMPORT_ID,
        student_id: 'user-a',
        career_id: CAREER_ID,
        status: 'completed',
        extracted_data: { subjects: [], prerequisites: [] },
      },
    ]);

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/curriculum/imports/${IMPORT_ID}/confirm`,
      headers: AUTH,
    });

    expect(res.statusCode).toBe(400);
  });

  it('lista inconsistencias de una importación (RF-024)', async () => {
    testStore.seed('curriculum_imports', [
      {
        id: IMPORT_ID,
        student_id: 'user-a',
        career_id: CAREER_ID,
        status: 'review',
        inconsistencies: [
          { type: 'duplicate_code', message: 'MAT-101 duplicada', subject_code: 'MAT-101' },
        ],
      },
    ]);

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/curriculum/imports/${IMPORT_ID}/inconsistencies`,
      headers: AUTH,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json<{ inconsistencies: unknown[] }>().inconsistencies).toHaveLength(1);
  });

  it('lista materias propias y sus requisitos (RF-027)', async () => {
    testStore.seed('subjects', [
      {
        id: SUBJECT_ID,
        student_id: 'user-a',
        career_id: CAREER_ID,
        code: 'MAT-201',
        name: 'Cálculo II',
        credits: 4,
        semester: 2,
        is_elective: false,
        source: 'pdf_import',
      },
      {
        id: PREREQ_ID,
        student_id: 'user-a',
        career_id: CAREER_ID,
        code: 'MAT-101',
        name: 'Cálculo I',
        credits: 4,
        semester: 1,
        is_elective: false,
        source: 'pdf_import',
      },
      {
        id: '00000000-0000-4000-8000-0000000000b9',
        student_id: 'user-b',
        career_id: CAREER_ID,
        code: 'AJE-101',
        name: 'Materia ajena',
        credits: 3,
        semester: 1,
        is_elective: false,
        source: 'manual',
      },
    ]);
    testStore.seed('prerequisites', [
      {
        id: 'p-1',
        student_id: 'user-a',
        subject_id: SUBJECT_ID,
        prerequisite_subject_id: PREREQ_ID,
      },
    ]);

    const listRes = await app.inject({ method: 'GET', url: '/api/v1/subjects', headers: AUTH });
    expect(listRes.statusCode).toBe(200);
    const subjects = listRes.json<{ subjects: { code: string }[] }>().subjects;
    expect(subjects.map((subject) => subject.code)).toEqual(['MAT-101', 'MAT-201']);

    const prereqRes = await app.inject({
      method: 'GET',
      url: `/api/v1/subjects/${SUBJECT_ID}/prerequisites`,
      headers: AUTH,
    });
    expect(prereqRes.statusCode).toBe(200);
    const prerequisites = prereqRes.json<{ prerequisites: { code: string }[] }>().prerequisites;
    expect(prerequisites).toHaveLength(1);
    expect(prerequisites[0]?.code).toBe('MAT-101');
  });
});
