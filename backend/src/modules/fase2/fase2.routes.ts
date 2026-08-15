import { z } from 'zod';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getAIProvider } from '../../infrastructure/ai/provider.js';
import { createUserClient } from '../../infrastructure/database/supabase.client.js';
import { getServiceClient } from '../../infrastructure/database/supabase.client.js';
import { AppError, NotFoundError } from '../../shared/errors/app-error.js';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import { listUpcomingSchedules } from '../schedule/schedule.service.js';

export async function classesRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.post('/classes/transcripts', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = z
      .object({
        material_id: z.uuid().optional().nullable(),
        course_id: z.uuid().optional().nullable(),
        text: z.string().min(10),
      })
      .parse(request.body);
    const supabase = createUserClient(request.user.token);
    const analysis = await getAIProvider().analyzeContent(body.text, 'video_transcript');
    const { data, error } = await supabase
      .from('transcripts')
      .insert({
        student_id: request.user.id,
        material_id: body.material_id ?? null,
        course_id: body.course_id ?? null,
        full_text: body.text,
        summary: String(analysis.summary ?? ''),
        keywords: (analysis.keywords as string[]) ?? [],
      })
      .select('*')
      .single();
    if (error || !data) throw new AppError('No se pudo guardar transcripción', 500, 'DB_ERROR');

    await supabase.from('transcript_segments').insert({
      transcript_id: data.id,
      student_id: request.user.id,
      start_ms: 0,
      end_ms: 60000,
      text: body.text.slice(0, 500),
    });
    await reply.status(201).send(data);
  });

  app.get('/classes/transcripts', async (request: FastifyRequest, reply: FastifyReply) => {
    const supabase = createUserClient(request.user.token);
    const { data, error } = await supabase
      .from('transcripts')
      .select('*')
      .eq('student_id', request.user.id)
      .order('created_at', { ascending: false });
    if (error) throw new AppError('No se pudieron listar transcripciones', 500, 'DB_ERROR');
    await reply.status(200).send({ transcripts: data ?? [] });
  });
}

export async function learningPlansRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.post('/learning-plans', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = z.object({ title: z.string().min(1).optional() }).parse(request.body ?? {});
    const supabase = createUserClient(request.user.token);
    const { data: gaps } = await supabase
      .from('knowledge_gaps')
      .select('id, reason, priority')
      .eq('student_id', request.user.id)
      .eq('status', 'open')
      .limit(5);
    const title = body.title ?? 'Plan personalizado';
    const { data: plan, error } = await supabase
      .from('learning_plans')
      .insert({ student_id: request.user.id, title })
      .select('*')
      .single();
    if (error || !plan) throw new AppError('No se pudo crear el plan', 500, 'DB_ERROR');

    const activities = [];
    for (const gap of gaps ?? []) {
      const { data } = await supabase
        .from('learning_activities')
        .insert({
          plan_id: plan.id,
          student_id: request.user.id,
          title: `Reforzar: ${gap.reason ?? gap.priority}`,
          technique: 'active_recall',
          estimated_minutes: gap.priority === 'critical' ? 45 : 30,
        })
        .select('*')
        .single();
      if (data) activities.push(data);
    }
    await reply.status(201).send({ plan, activities });
  });

  app.get('/learning-plans', async (request: FastifyRequest, reply: FastifyReply) => {
    const supabase = createUserClient(request.user.token);
    const { data, error } = await supabase
      .from('learning_plans')
      .select('*, activities:learning_activities(*)')
      .eq('student_id', request.user.id);
    if (error) throw new AppError('No se pudieron listar planes', 500, 'DB_ERROR');
    await reply.status(200).send({ plans: data ?? [] });
  });

  app.post('/learning-plans/activities/:id/complete', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const supabase = createUserClient(request.user.token);
    const { data, error } = await supabase
      .from('learning_activities')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('student_id', request.user.id)
      .select('*')
      .maybeSingle();
    if (error) throw new AppError('No se pudo completar actividad', 500, 'DB_ERROR');
    if (!data) throw new NotFoundError('Actividad no encontrada');
    await reply.status(200).send(data);
  });
}

export async function resourcesRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.post('/resources/search', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = z.object({ query: z.string().min(1) }).parse(request.body);
    const supabase = createUserClient(request.user.token);
    const analysis = await getAIProvider().analyzeContent(body.query, 'resource_search');
    const { data, error } = await supabase
      .from('educational_resources')
      .insert({
        student_id: request.user.id,
        title: String(analysis.title ?? body.query),
        url: `https://scholar.google.com/scholar?q=${encodeURIComponent(body.query)}`,
        source: 'scholar',
        reliability: 'high',
        reason: 'Priorizado por relevancia al concepto consultado',
      })
      .select('*')
      .single();
    if (error || !data) throw new AppError('No se pudo registrar recurso', 500, 'DB_ERROR');
    await reply.status(201).send({ resources: [data] });
  });

  app.post('/resources/:id/save', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const supabase = createUserClient(request.user.token);
    const { data: resource } = await supabase
      .from('educational_resources')
      .select('id')
      .eq('id', id)
      .eq('student_id', request.user.id)
      .maybeSingle();
    if (!resource) throw new NotFoundError('Recurso no encontrado');
    const { data, error } = await supabase
      .from('saved_resources')
      .upsert({ student_id: request.user.id, resource_id: id }, { onConflict: 'student_id,resource_id' })
      .select('*')
      .single();
    if (error || !data) throw new AppError('No se pudo guardar', 500, 'DB_ERROR');
    await reply.status(201).send(data);
  });

  app.get('/resources', async (request: FastifyRequest, reply: FastifyReply) => {
    const supabase = createUserClient(request.user.token);
    const { data, error } = await supabase
      .from('educational_resources')
      .select(
        'id, title, url, source_type, origin, language, reliability_score, recommendation_reason, topics, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw new AppError('No se pudieron listar recursos', 500, 'DB_ERROR');
    await reply.status(200).send({ resources: data ?? [] });
  });
}

export async function preparationRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/preparation/next', async (request: FastifyRequest, reply: FastifyReply) => {
    const upcoming = await listUpcomingSchedules(request.user.token, request.user.id, 24 * 60);
    const supabase = createUserClient(request.user.token);
    const { data: gaps } = await supabase
      .from('knowledge_gaps')
      .select('*')
      .eq('student_id', request.user.id)
      .eq('status', 'open')
      .limit(5);
    const next = upcoming[0] ?? null;
    const recommendation = await getAIProvider().generateText(
      `Prepara la próxima clase. Gaps: ${JSON.stringify(gaps ?? [])}. Clase: ${JSON.stringify(next)}`,
    );
    await reply.status(200).send({
      next_class: next,
      gaps: gaps ?? [],
      recommendation,
      estimated_prep_minutes: 25,
    });
  });
}

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/admin/quotas/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const supabase = createUserClient(request.user.token);
    const { data } = await supabase
      .from('storage_quotas')
      .select('*')
      .eq('student_id', request.user.id)
      .maybeSingle();
    await reply.status(200).send({
      quota: data ?? {
        student_id: request.user.id,
        used_bytes: 0,
        limit_bytes: 5368709120,
      },
    });
  });

  app.post('/admin/audit', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = z
      .object({
        action: z.string().min(1),
        entity_type: z.string().optional(),
        entity_id: z.uuid().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(request.body);
    // Audit insert: service role permitido (SECURITY.md R5 jobs/admin)
    const { data, error } = await getServiceClient()
      .from('audit_logs')
      .insert({
        student_id: request.user.id,
        action: body.action,
        entity_type: body.entity_type ?? null,
        entity_id: body.entity_id ?? null,
        metadata: body.metadata ?? null,
      })
      .select('*')
      .single();
    if (error || !data) throw new AppError('No se pudo registrar auditoría', 500, 'DB_ERROR');
    await reply.status(201).send(data);
  });
}
