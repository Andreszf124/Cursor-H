import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import { getAIProvider } from '../../infrastructure/ai/provider.js';
import { createUserClient } from '../../infrastructure/database/supabase.client.js';
import { AppError, NotFoundError, ValidationError } from '../../shared/errors/app-error.js';
import {
  chunkText,
  detectMaterialType,
  extractTextSample,
  MAX_MATERIAL_BYTES,
} from '../../shared/utils/material-validation.js';
import type {
  listMaterialsSchema,
  searchMaterialsSchema,
  updateMaterialSchema,
  uploadMaterialSchema,
} from './materials.schemas.js';

type UploadMeta = z.infer<typeof uploadMaterialSchema>;
type UpdateMaterial = z.infer<typeof updateMaterialSchema>;
type SearchParams = z.infer<typeof searchMaterialsSchema>;
type ListParams = z.infer<typeof listMaterialsSchema>;

const MATERIALS_BUCKET = 'materials';

export class MaterialsService {
  /** RF-051–056, RF-060 — sube el archivo, genera metadata IA e indexa para RAG */
  async upload(
    token: string,
    userId: string,
    buffer: Buffer,
    originalName: string,
    meta: UploadMeta,
  ) {
    if (buffer.length === 0) {
      throw new ValidationError('El archivo está vacío');
    }
    if (buffer.length > MAX_MATERIAL_BYTES) {
      throw new ValidationError('El archivo no puede superar los 10MB');
    }

    const detected = detectMaterialType(buffer);
    if (!detected) {
      throw new ValidationError('Formato no permitido: solo PDF, PNG, JPEG o DOCX');
    }

    const supabase = createUserClient(token);

    // La asociación a curso se valida contra el dueño del JWT (SECURITY.md R1)
    if (meta.course_id) {
      const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', meta.course_id)
        .eq('student_id', userId)
        .maybeSingle();
      if (!course) throw new NotFoundError('Curso no encontrado');
    }

    const path = `${userId}/${randomUUID()}.${detected.ext}`;
    const { error: uploadError } = await supabase.storage
      .from(MATERIALS_BUCKET)
      .upload(path, buffer, { contentType: detected.mime, upsert: false });
    if (uploadError) {
      throw new AppError('No se pudo subir el material', 500, 'STORAGE_ERROR');
    }

    const textSample = extractTextSample(buffer);
    const title = meta.title ?? originalName.replace(/\.[^.]+$/, '').slice(0, 200) ?? 'Material';
    let metadata: Record<string, unknown> | null;
    try {
      metadata = await getAIProvider().analyzeContent(textSample, 'material_metadata');
    } catch {
      metadata = null;
    }

    const { data, error } = await supabase
      .from('materials')
      .insert({
        student_id: userId,
        course_id: meta.course_id ?? null,
        title,
        file_path: path,
        mime_type: detected.mime,
        category: meta.category,
        file_size: buffer.length,
        metadata,
      })
      .select('*')
      .single();
    if (error || !data) {
      throw new AppError('No se pudo registrar el material', 500, 'DB_ERROR');
    }

    await this.indexMaterial(token, userId, data.id as string, textSample);
    return data;
  }

  /** RF-101 — chunks + embeddings del material, siempre marcados con student_id */
  private async indexMaterial(
    token: string,
    userId: string,
    materialId: string,
    text: string,
  ): Promise<void> {
    const chunks = chunkText(text);
    if (chunks.length === 0) return;

    const supabase = createUserClient(token);
    try {
      const { data: inserted } = await supabase
        .from('content_chunks')
        .insert(
          chunks.map((content, index) => ({
            material_id: materialId,
            student_id: userId,
            chunk_index: index,
            content,
            token_count: Math.ceil(content.length / 4),
          })),
        )
        .select('id, chunk_index');

      const rows = (inserted ?? []) as { id: string; chunk_index: number }[];
      if (rows.length === 0) return;

      const vectors = await getAIProvider().embed(
        rows.map((row) => chunks[row.chunk_index] ?? ''),
      );
      await supabase.from('embeddings').insert(
        rows.map((row, index) => ({
          chunk_id: row.id,
          student_id: userId,
          embedding: vectors[index] ?? [],
        })),
      );
    } catch {
      // Indexado best-effort: el material queda disponible aunque el RAG falle.
    }
  }

  async list(token: string, userId: string, params: ListParams) {
    const supabase = createUserClient(token);
    let query = supabase
      .from('materials')
      .select('*')
      .eq('student_id', userId)
      .is('deleted_at', null);
    if (params.category) query = query.eq('category', params.category);
    if (params.course_id) query = query.eq('course_id', params.course_id);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new AppError('No se pudieron listar materiales', 500, 'DB_ERROR');
    return data ?? [];
  }

  /** RF-058 — búsqueda por título dentro de los materiales del estudiante */
  async search(token: string, userId: string, params: SearchParams) {
    const supabase = createUserClient(token);
    const term = params.q.replace(/[%,()]/g, ' ').trim();
    let query = supabase
      .from('materials')
      .select('*')
      .eq('student_id', userId)
      .is('deleted_at', null)
      .ilike('title', `%${term}%`);
    if (params.category) query = query.eq('category', params.category);
    if (params.course_id) query = query.eq('course_id', params.course_id);

    const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
    if (error) throw new AppError('No se pudo buscar materiales', 500, 'DB_ERROR');
    return data ?? [];
  }

  async get(token: string, userId: string, id: string) {
    const supabase = createUserClient(token);
    const { data } = await supabase
      .from('materials')
      .select('*')
      .eq('id', id)
      .eq('student_id', userId)
      .is('deleted_at', null)
      .maybeSingle();
    if (!data) throw new NotFoundError('Material no encontrado');
    return data;
  }

  /** RF-057 — cambia categoría/curso/título */
  async update(token: string, userId: string, id: string, input: UpdateMaterial) {
    await this.get(token, userId, id);
    const supabase = createUserClient(token);

    if (input.course_id) {
      const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', input.course_id)
        .eq('student_id', userId)
        .maybeSingle();
      if (!course) throw new NotFoundError('Curso no encontrado');
    }

    const { data, error } = await supabase
      .from('materials')
      .update(input)
      .eq('id', id)
      .eq('student_id', userId)
      .select('*')
      .single();
    if (error || !data) throw new AppError('No se pudo actualizar el material', 500, 'DB_ERROR');
    return data;
  }

  /** RF-059 — borrado lógico + eliminación del objeto en Storage */
  async remove(token: string, userId: string, id: string) {
    const material = await this.get(token, userId, id);
    const supabase = createUserClient(token);

    const { error } = await supabase
      .from('materials')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('student_id', userId);
    if (error) throw new AppError('No se pudo eliminar el material', 500, 'DB_ERROR');

    try {
      await supabase.storage.from(MATERIALS_BUCKET).remove([material.file_path as string]);
    } catch {
      // El objeto huérfano se limpia por job; la fila ya quedó marcada.
    }
  }

  /** URL firmada de corta duración: el bucket es privado (SECURITY.md §5.3) */
  async signedUrl(token: string, userId: string, id: string) {
    const material = await this.get(token, userId, id);
    const supabase = createUserClient(token);
    const { data, error } = await supabase.storage
      .from(MATERIALS_BUCKET)
      .createSignedUrl(material.file_path as string, 300);
    if (error || !data?.signedUrl) {
      throw new AppError('No se pudo generar el enlace', 500, 'STORAGE_ERROR');
    }
    return { url: data.signedUrl, expires_in: 300 };
  }
}

export const materialsService = new MaterialsService();
