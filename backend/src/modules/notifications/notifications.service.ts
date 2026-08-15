import type { z } from 'zod';
import { createUserClient } from '../../infrastructure/database/supabase.client.js';
import { AppError, NotFoundError } from '../../shared/errors/app-error.js';
import { scheduleService } from '../schedule/schedule.service.js';
import type {
  listNotificationsSchema,
  NOTIFICATION_TYPES,
  updatePreferencesSchema,
} from './notifications.schemas.js';

type ListParams = z.infer<typeof listNotificationsSchema>;
type UpdatePreferences = z.infer<typeof updatePreferencesSchema>;
type NotificationType = (typeof NOTIFICATION_TYPES)[number];

interface UpcomingClass {
  id?: string;
  course_id?: string;
  end_time?: string;
  course?: { id?: string; name?: string } | null;
}

const DEFAULT_PREFERENCES = {
  class_reminders: true,
  checkin_reminders: true,
  activity_reminders: true,
};

export class NotificationsService {
  async list(token: string, userId: string, params: ListParams) {
    const supabase = createUserClient(token);
    let query = supabase.from('notifications').select('*').eq('student_id', userId);
    if (params.unread) query = query.is('read_at', null);
    if (params.type) query = query.eq('type', params.type);

    const { data, error } = await query.order('created_at', { ascending: false }).limit(100);
    if (error) throw new AppError('No se pudieron listar notificaciones', 500, 'DB_ERROR');
    return data ?? [];
  }

  async markRead(token: string, userId: string, id: string) {
    const supabase = createUserClient(token);
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('id', id)
      .eq('student_id', userId)
      .maybeSingle();
    if (!existing) throw new NotFoundError('Notificación no encontrada');

    const { data, error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('student_id', userId)
      .select('*')
      .single();
    if (error || !data) throw new AppError('No se pudo marcar como leída', 500, 'DB_ERROR');
    return data;
  }

  async markAllRead(token: string, userId: string) {
    const supabase = createUserClient(token);
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('student_id', userId)
      .is('read_at', null);
    if (error) throw new AppError('No se pudieron marcar como leídas', 500, 'DB_ERROR');
  }

  /** RF-151 — crea las preferencias por defecto la primera vez que se consultan */
  async getPreferences(token: string, userId: string) {
    const supabase = createUserClient(token);
    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('student_id', userId)
      .maybeSingle();
    if (data) return data;

    const { data: created, error } = await supabase
      .from('notification_preferences')
      .insert({ student_id: userId, ...DEFAULT_PREFERENCES })
      .select('*')
      .single();
    if (error || !created) {
      return { student_id: userId, ...DEFAULT_PREFERENCES };
    }
    return created;
  }

  async updatePreferences(token: string, userId: string, input: UpdatePreferences) {
    await this.getPreferences(token, userId);
    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('notification_preferences')
      .update(input)
      .eq('student_id', userId)
      .select('*')
      .single();
    if (error || !data) throw new AppError('No se pudieron guardar preferencias', 500, 'DB_ERROR');
    return data;
  }

  private async create(
    token: string,
    userId: string,
    rows: {
      type: NotificationType;
      title: string;
      body?: string;
      payload?: Record<string, unknown>;
      scheduled_for?: string;
    }[],
  ) {
    if (rows.length === 0) return [];
    const supabase = createUserClient(token);
    const { data, error } = await supabase
      .from('notifications')
      .insert(rows.map((row) => ({ ...row, student_id: userId })))
      .select('*');
    if (error) throw new AppError('No se pudo crear la notificación', 500, 'DB_ERROR');
    return data ?? [];
  }

  /** RF-146 — recordatorio de clase para las clases próximas del estudiante */
  async createClassReminders(token: string, userId: string) {
    const upcoming = (await scheduleService.getUpcoming(token, userId)) as UpcomingClass[];
    const enabled = await this.remindersEnabled(token, userId, 'class_reminders');
    if (!enabled) return [];

    return this.create(
      token,
      userId,
      upcoming.map((item) => ({
        type: 'class_reminder' as const,
        title: `Clase próxima: ${item.course?.name ?? 'tu curso'}`,
        body: 'Tu clase está por comenzar o terminar. Ten listo el material.',
        payload: { schedule_id: item.id, course_id: item.course_id },
      })),
    );
  }

  /** RF-147, RF-082 — recordatorio de check-in cuando la clase termina */
  async createCheckinReminders(token: string, userId: string) {
    const upcoming = (await scheduleService.getUpcoming(token, userId)) as UpcomingClass[];
    const enabled = await this.remindersEnabled(token, userId, 'checkin_reminders');
    if (!enabled) return [];

    return this.create(
      token,
      userId,
      upcoming.map((item) => ({
        type: 'checkin_reminder' as const,
        title: `Check-in de ${item.course?.name ?? 'tu clase'}`,
        body: '¿Qué temas viste hoy? Registra tu check-in mientras está fresco.',
        payload: { schedule_id: item.id, course_id: item.course_id },
      })),
    );
  }

  /** RF-148 — recordatorio de actividades pendientes del plan activo */
  async createActivityReminders(token: string, userId: string) {
    const enabled = await this.remindersEnabled(token, userId, 'activity_reminders');
    if (!enabled) return [];

    const supabase = createUserClient(token);
    const { data } = await supabase
      .from('learning_activities')
      .select('id, title, estimated_minutes')
      .eq('student_id', userId)
      .eq('status', 'pending')
      .limit(5);

    const activities = (data ?? []) as { id: string; title: string }[];
    return this.create(
      token,
      userId,
      activities.map((activity) => ({
        type: 'activity_reminder' as const,
        title: `Actividad pendiente: ${activity.title}`,
        body: 'Retoma tu plan de estudio donde lo dejaste.',
        payload: { activity_id: activity.id },
      })),
    );
  }

  /** Corre los recordatorios derivados del horario (usado por el scheduler) */
  async scheduleUpcoming(token: string, userId: string) {
    const classReminders = await this.createClassReminders(token, userId);
    const checkinReminders = await this.createCheckinReminders(token, userId);
    return {
      class_reminders: classReminders.length,
      checkin_reminders: checkinReminders.length,
    };
  }

  private async remindersEnabled(
    token: string,
    userId: string,
    key: 'class_reminders' | 'checkin_reminders' | 'activity_reminders',
  ): Promise<boolean> {
    const prefs = (await this.getPreferences(token, userId)) as Record<string, unknown>;
    return prefs[key] !== false;
  }
}

export const notificationsService = new NotificationsService();
