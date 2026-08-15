import type { z } from 'zod';
import { createUserClient } from '../../infrastructure/database/supabase.client.js';
import { AppError, NotFoundError } from '../../shared/errors/app-error.js';
import type { saveResourceSchema, searchResourcesSchema } from './resources.schemas.js';

type SearchResources = z.infer<typeof searchResourcesSchema>;
type SaveResource = z.infer<typeof saveResourceSchema>;

interface ResourceRow {
  id: string;
  title: string;
  url: string;
  source_type: string;
  origin: string | null;
  reliability_score: number | string;
  recommendation_reason: string | null;
}

/** RF-127 — dominios académicos reconocidos suben la confianza del recurso */
const TRUSTED_HINTS = ['.edu', '.ac.', 'khanacademy', 'mit', 'coursera', 'openstax'];

function reliabilityOf(resource: ResourceRow): number {
  const base = Number(resource.reliability_score ?? 0.5);
  const bonus = TRUSTED_HINTS.some((hint) => resource.url.includes(hint)) ? 0.1 : 0;
  return Math.min(1, Math.round((base + bonus) * 100) / 100);
}

export class ResourcesService {
  /** RF-125–129 — búsqueda ordenada por confiabilidad, con origen y motivo */
  async search(token: string, userId: string, params: SearchResources) {
    const supabase = createUserClient(token);
    const term = params.q.replace(/[%,()]/g, ' ').trim();
    let query = supabase
      .from('educational_resources')
      .select('*')
      .ilike('title', `%${term}%`);
    if (params.source_type) query = query.eq('source_type', params.source_type);
    if (params.language) query = query.eq('language', params.language);

    const { data, error } = await query
      .order('reliability_score', { ascending: false })
      .limit(30);
    if (error) throw new AppError('No se pudo buscar recursos', 500, 'DB_ERROR');

    const { data: saved } = await supabase
      .from('saved_resources')
      .select('resource_id')
      .eq('student_id', userId);
    const savedIds = new Set(
      ((saved ?? []) as { resource_id: string }[]).map((row) => row.resource_id),
    );

    return ((data ?? []) as ResourceRow[])
      .map((resource) => ({
        ...resource,
        reliability_score: reliabilityOf(resource),
        recommendation_reason:
          resource.recommendation_reason ??
          `Coincide con "${params.q}" y proviene de ${resource.origin ?? 'una fuente educativa'}.`,
        saved: savedIds.has(resource.id),
      }))
      .sort((a, b) => b.reliability_score - a.reliability_score);
  }

  /** RF-130 */
  async save(token: string, userId: string, resourceId: string, input: SaveResource) {
    const supabase = createUserClient(token);
    const { data: resource } = await supabase
      .from('educational_resources')
      .select('id')
      .eq('id', resourceId)
      .maybeSingle();
    if (!resource) throw new NotFoundError('Recurso no encontrado');

    const { data, error } = await supabase
      .from('saved_resources')
      .upsert(
        {
          student_id: userId,
          resource_id: resourceId,
          concept_id: input.concept_id ?? null,
          note: input.note ?? null,
        },
        { onConflict: 'student_id,resource_id' },
      )
      .select('*')
      .single();
    if (error || !data) throw new AppError('No se pudo guardar el recurso', 500, 'DB_ERROR');
    return data;
  }

  async listSaved(token: string, userId: string) {
    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('saved_resources')
      .select('*, resource:educational_resources(id, title, url, source_type, origin)')
      .eq('student_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw new AppError('No se pudieron listar recursos guardados', 500, 'DB_ERROR');
    return data ?? [];
  }

  async removeSaved(token: string, userId: string, id: string) {
    const supabase = createUserClient(token);
    const { data: existing } = await supabase
      .from('saved_resources')
      .select('id')
      .eq('id', id)
      .eq('student_id', userId)
      .maybeSingle();
    if (!existing) throw new NotFoundError('Recurso guardado no encontrado');

    const { error } = await supabase
      .from('saved_resources')
      .delete()
      .eq('id', id)
      .eq('student_id', userId);
    if (error) throw new AppError('No se pudo eliminar', 500, 'DB_ERROR');
  }
}

export const resourcesService = new ResourcesService();
