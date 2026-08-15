import { createUserClient } from '../database/supabase.client.js';
import { AppError } from '../../shared/errors/app-error.js';
import { getAIProvider } from './provider.js';

export interface RetrievedChunk {
  chunk_id: string;
  material_id: string | null;
  title: string | null;
  content: string;
  similarity: number;
}

export interface RetrieveOptions {
  courseId?: string | null;
  limit?: number;
}

interface EmbeddingRow {
  chunk_id: string;
  embedding: unknown;
  student_id?: string;
}

interface ChunkRow {
  id: string;
  content: string;
  material_id: string | null;
  student_id: string;
}

interface MaterialRow {
  id: string;
  title: string;
  course_id: string | null;
  student_id: string;
}

/** pgvector puede llegar como array JSON o como texto "[0.1,0.2]" según el driver */
function parseVector(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw.map((value) => Number(value));
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.map((value) => Number(value)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  if (length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < length; index += 1) {
    dot += a[index]! * b[index]!;
    normA += a[index]! * a[index]!;
    normB += b[index]! * b[index]!;
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dot / denominator;
}

function uniqueIds(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

/**
 * Recuperación semántica para el tutor y la generación de prácticas (RF-101, RF-119).
 *
 * REGLA CRÍTICA (SECURITY.md R1/R6): el retrieval SIEMPRE se filtra por
 * studentId. Sin studentId no hay búsqueda: se lanza error en lugar de
 * degradar a una consulta global que expondría material de otro estudiante.
 * El join con chunks y materiales se hace en código: PostgREST embed falla
 * en este esquema y mezclaría filas si no se revalida student_id.
 */
export async function retrieveChunks(
  token: string,
  studentId: string,
  query: string,
  limit = 5,
  options: RetrieveOptions = {},
): Promise<RetrievedChunk[]> {
  if (!studentId) {
    throw new AppError('RAG requiere student_id', 500, 'RAG_MISSING_STUDENT');
  }
  if (!query.trim()) return [];

  const supabase = createUserClient(token);
  const { data, error } = await supabase
    .from('embeddings')
    .select('chunk_id, embedding, student_id')
    .eq('student_id', studentId)
    .limit(500);
  if (error) throw new AppError('No se pudo consultar el índice', 500, 'RAG_ERROR');

  const rows = (data ?? []) as EmbeddingRow[];
  const chunkIds = uniqueIds(rows.map((row) => row.chunk_id));
  if (chunkIds.length === 0) return [];

  const { data: chunkRows, error: chunkError } = await supabase
    .from('content_chunks')
    .select('id, content, material_id, student_id')
    .eq('student_id', studentId)
    .in('id', chunkIds);
  if (chunkError) throw new AppError('No se pudieron leer los fragmentos', 500, 'RAG_ERROR');

  const chunks = ((chunkRows ?? []) as ChunkRow[]).filter((chunk) => chunk.student_id === studentId);
  const chunkById = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  const materialIds = uniqueIds(chunks.map((chunk) => chunk.material_id));

  const materials = new Map<string, MaterialRow>();
  if (materialIds.length > 0) {
    const { data: materialRows, error: materialError } = await supabase
      .from('materials')
      .select('id, title, course_id, student_id')
      .eq('student_id', studentId)
      .in('id', materialIds);
    if (materialError) throw new AppError('No se pudieron leer los materiales', 500, 'RAG_ERROR');
    for (const material of (materialRows ?? []) as MaterialRow[]) {
      if (material.student_id === studentId) materials.set(material.id, material);
    }
  }

  const [queryVector] = await getAIProvider().embed([query]);
  if (!queryVector) return [];

  const courseId = options.courseId ?? null;
  const ranked: RetrievedChunk[] = [];
  for (const row of rows) {
    if (row.student_id && row.student_id !== studentId) continue;
    const chunk = chunkById.get(row.chunk_id);
    if (!chunk || !chunk.content) continue;
    const material = chunk.material_id ? materials.get(chunk.material_id) : undefined;
    if (courseId && material?.course_id !== courseId) continue;
    ranked.push({
      chunk_id: row.chunk_id,
      material_id: chunk.material_id,
      title: material?.title ?? null,
      content: chunk.content,
      similarity: cosineSimilarity(queryVector, parseVector(row.embedding)),
    });
  }

  const take = options.limit ?? limit;
  return ranked.sort((a, b) => b.similarity - a.similarity).slice(0, take);
}
