import type { z } from 'zod';
import { env } from '../../config/env.js';
import { createUserClient } from '../../infrastructure/database/supabase.client.js';
import { AppError, NotFoundError, ValidationError } from '../../shared/errors/app-error.js';
import { recordAudit } from '../../shared/utils/audit.js';
import { DEMO_COURSES } from './demo-courses.js';
import type {
  connectCampusSchema,
  connectTeamsSchema,
  linkMeetingSchema,
} from './integrations.schemas.js';

type ConnectCampus = z.infer<typeof connectCampusSchema>;
type ConnectTeams = z.infer<typeof connectTeamsSchema>;
type LinkMeeting = z.infer<typeof linkMeetingSchema>;

type Provider = 'campus' | 'teams';

function microsoftConfigured(): boolean {
  return Boolean(
    env.MICROSOFT_CLIENT_ID?.trim() &&
      env.MICROSOFT_CLIENT_SECRET?.trim() &&
      env.MICROSOFT_REDIRECT_URI?.trim(),
  );
}

function microsoftTenant(): string {
  return env.MICROSOFT_TENANT_ID?.trim() || 'common';
}

export class IntegrationsService {
  async list(token: string, userId: string) {
    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('integrations')
      .select('id, provider, status, external_account_id, metadata, connected_at, disconnected_at')
      .eq('student_id', userId);
    if (error) throw new AppError('No se pudieron listar integraciones', 500, 'DB_ERROR');
    return data ?? [];
  }

  /**
   * RF-042, RF-050 — conexión con el campus virtual.
   * Solo se persiste la URL y el usuario visible: la autenticación real la
   * realiza la extensión de navegador en la sesión del propio estudiante,
   * por lo que el backend nunca ve ni almacena su contraseña.
   */
  async connectCampus(token: string, userId: string, input: ConnectCampus) {
    const integration = await this.upsert(token, userId, 'campus', {
      status: 'connected',
      external_account_id: input.username,
      metadata: {
        campus_url: input.campus_url,
        institution_name: input.institution_name ?? null,
        credentials_stored: false,
      },
    });
    await recordAudit({
      studentId: userId,
      action: 'integration.campus.connect',
      entityType: 'integration',
      entityId: integration.id as string,
    });
    return integration;
  }

  /** RF-073, RF-074 — conexión con Teams vía identificador opaco de cuenta */
  async connectTeams(token: string, userId: string, input: ConnectTeams) {
    const integration = await this.upsert(token, userId, 'teams', {
      status: 'connected',
      external_account_id: input.external_account_id,
      metadata: {
        tenant_name: input.tenant_name ?? null,
        scopes: ['OnlineMeetings.Read', 'Files.Read'],
        credentials_stored: false,
      },
    });
    await recordAudit({
      studentId: userId,
      action: 'integration.teams.connect',
      entityType: 'integration',
      entityId: integration.id as string,
    });
    return integration;
  }

  getTeamsAuthUrl(): { available: false } | { available: true; auth_url: string } {
    if (!microsoftConfigured()) {
      return { available: false };
    }
    const params = new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID!,
      response_type: 'code',
      redirect_uri: env.MICROSOFT_REDIRECT_URI!,
      response_mode: 'query',
      scope: 'openid profile User.Read Calendars.Read OnlineMeetings.Read',
    });
    const authUrl = `https://login.microsoftonline.com/${microsoftTenant()}/oauth2/v2.0/authorize?${params.toString()}`;
    return { available: true, auth_url: authUrl };
  }

  /**
   * Intercambia el code de OAuth por identidad. Los tokens de Graph no se
   * persisten en metadata (RF-050 / prototipo).
   */
  async handleTeamsCallback(token: string, userId: string, code: string) {
    if (!microsoftConfigured()) {
      throw new AppError(
        'OAuth de Microsoft no está configurado. Usa la importación de demostración.',
        400,
        'OAUTH_NOT_CONFIGURED',
      );
    }

    const body = new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID!,
      client_secret: env.MICROSOFT_CLIENT_SECRET!,
      code,
      redirect_uri: env.MICROSOFT_REDIRECT_URI!,
      grant_type: 'authorization_code',
    });

    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${microsoftTenant()}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      },
    );

    if (!tokenResponse.ok) {
      throw new AppError('No se pudo completar el inicio de sesión con Microsoft', 400, 'OAUTH_FAILED');
    }

    const tokenJson = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenJson.access_token) {
      throw new AppError('No se pudo completar el inicio de sesión con Microsoft', 400, 'OAUTH_FAILED');
    }

    const meResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!meResponse.ok) {
      throw new AppError('No se pudo leer la cuenta de Microsoft', 400, 'OAUTH_FAILED');
    }

    const me = (await meResponse.json()) as { id?: string; userPrincipalName?: string };
    const externalId = me.id ?? me.userPrincipalName;
    if (!externalId) {
      throw new AppError('No se pudo leer la cuenta de Microsoft', 400, 'OAUTH_FAILED');
    }

    return this.connectTeams(token, userId, { external_account_id: externalId });
  }

  /** Prototipo: payload de demostración (Graph completo queda fuera de alcance). */
  listTeamsCourses() {
    return { demo: true as const, courses: DEMO_COURSES };
  }

  /** RF-049, RF-080 */
  async disconnect(token: string, userId: string, provider: Provider) {
    const supabase = createUserClient(token);
    const { data: existing } = await supabase
      .from('integrations')
      .select('id')
      .eq('student_id', userId)
      .eq('provider', provider)
      .maybeSingle();
    if (!existing) throw new NotFoundError('Integración no encontrada');

    const { data, error } = await supabase
      .from('integrations')
      .update({
        status: 'disconnected',
        external_account_id: null,
        metadata: null,
        disconnected_at: new Date().toISOString(),
      })
      .eq('id', existing.id as string)
      .eq('student_id', userId)
      .select('*')
      .single();
    if (error || !data) throw new AppError('No se pudo desconectar', 500, 'DB_ERROR');

    await recordAudit({
      studentId: userId,
      action: `integration.${provider}.disconnect`,
      entityType: 'integration',
      entityId: existing.id as string,
    });
    return data;
  }

  async get(token: string, userId: string, provider: Provider) {
    const supabase = createUserClient(token);
    const { data } = await supabase
      .from('integrations')
      .select('id, provider, status, external_account_id, metadata, connected_at')
      .eq('student_id', userId)
      .eq('provider', provider)
      .maybeSingle();
    if (!data) throw new NotFoundError('Integración no encontrada');
    return data;
  }

  /**
   * RF-046–048 — sin extensión de campus, el prototipo responde con cursos demo
   * (documentado). Nunca acepta ni persiste contraseñas.
   */
  async importFromCampus() {
    return {
      imported: 0,
      demo: true as const,
      courses: DEMO_COURSES,
      warnings: ['Importación de demostración: la extensión de campus aún no está disponible'],
    };
  }

  /** RF-075 — listado de reuniones: vacío hasta integrar Microsoft Graph */
  async listMeetings(token: string, userId: string) {
    const integration = await this.get(token, userId, 'teams');
    return { status: integration.status, meetings: [] as Record<string, unknown>[] };
  }

  /** RF-078 — asocia una reunión de Teams a un curso del estudiante */
  async linkMeeting(token: string, userId: string, meetingId: string, input: LinkMeeting) {
    const integration = await this.get(token, userId, 'teams');
    const supabase = createUserClient(token);

    const { data: course } = await supabase
      .from('courses')
      .select('id')
      .eq('id', input.course_id)
      .eq('student_id', userId)
      .maybeSingle();
    if (!course) throw new NotFoundError('Curso no encontrado');

    const metadata = (integration.metadata as Record<string, unknown> | null) ?? {};
    const links = Array.isArray(metadata.meeting_links)
      ? (metadata.meeting_links as Record<string, unknown>[])
      : [];
    const next = [
      ...links.filter((link) => link.meeting_id !== meetingId),
      { meeting_id: meetingId, course_id: input.course_id },
    ];

    const { data, error } = await supabase
      .from('integrations')
      .update({ metadata: { ...metadata, meeting_links: next } })
      .eq('id', integration.id as string)
      .eq('student_id', userId)
      .select('*')
      .single();
    if (error || !data) throw new AppError('No se pudo asociar la reunión', 500, 'DB_ERROR');
    return data;
  }

  rejectPasswords(body: unknown): void {
    if (body && typeof body === 'object' && ('password' in body || 'Password' in body)) {
      throw new ValidationError('Nunca se deben enviar contraseñas (RF-050)');
    }
  }

  private async upsert(
    token: string,
    userId: string,
    provider: Provider,
    payload: {
      status: 'connected' | 'disconnected' | 'error';
      external_account_id: string | null;
      metadata: Record<string, unknown> | null;
    },
  ) {
    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('integrations')
      .upsert(
        {
          student_id: userId,
          provider,
          ...payload,
          connected_at: payload.status === 'connected' ? new Date().toISOString() : null,
          disconnected_at: null,
          last_error: null,
        },
        { onConflict: 'student_id,provider' },
      )
      .select('*')
      .single();
    if (error || !data) throw new AppError('No se pudo guardar la integración', 500, 'DB_ERROR');
    return data;
  }
}

export const integrationsService = new IntegrationsService();
