import { createUserClient } from '../database/supabase.client.js';
import { AppError } from '../../shared/errors/app-error.js';
import { getAIProvider } from './provider.js';

export interface RetrievedChunk {
  chunk_id: string;
  material_id: string | null;
  content: string;
  similarity: number;
}

interface EmbeddingRow {
  chunk_id: string;
  embedding: unknown;
  chunk?: {
    id?: string;
    content?: string;
    material_id?: string | null;
    student_id?: string;
  } | null;
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

/**
 * Recuperación semántica para el tutor y la generación de prácticas (RF-101, RF-119).
 *
 * REGLA CRÍTICA (SECURITY.md R1/R6): el retrieval SIEMPRE se filtra por
 * studentId. Sin studentId no hay búsqueda: se lanza error en lugar de
 * degradar a una consulta global que expondría material de otro estudiante.
 */
export async function retrieveChunks(
  token: string,
  studentId: string,
  query: string,
  limit = 5,
): Promise<RetrievedChunk[]> {
  if (!studentId) {
    throw new AppError('RAG requiere student_id', 500, 'RAG_MISSING_STUDENT');
  }
  if (!query.trim()) return [];

  const supabase = createUserClient(token);
  const { data, error } = await supabase
    .from('embeddings')
    .select('chunk_id, embedding, chunk:content_chunks(id, content, material_id, student_id)')
    .eq('student_id', studentId)
    .limit(500);
  if (error) throw new AppError('No se pudo consultar el índice', 500, 'RAG_ERROR');

  const rows = (data ?? []) as EmbeddingRow[];
  if (rows.length === 0) return [];

  const [queryVector] = await getAIProvider().embed([query]);
  if (!queryVector) return [];

  return rows
    // Defensa en profundidad: descarta cualquier fila que no sea del estudiante
    .filter((row) => !row.chunk?.student_id || row.chunk.student_id === studentId)
    .map((row) => ({
      chunk_id: row.chunk_id,
      material_id: row.chunk?.material_id ?? null,
      content: row.chunk?.content ?? '',
      similarity: cosineSimilarity(queryVector, parseVector(row.embedding)),
    }))
    .filter((chunk) => chunk.content.length > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}
