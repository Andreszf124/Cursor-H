import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import {
  activityRemindersHandler,
  getPreferencesHandler,
  listNotificationsHandler,
  markAllReadHandler,
  markReadHandler,
  scheduleUpcomingHandler,
  updatePreferencesHandler,
} from './notifications.handlers.js';

export async function notificationsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/notifications', listNotificationsHandler);
  // Rutas literales antes de /notifications/:id/... para evitar colisión de params
  app.get('/notifications/preferences', getPreferencesHandler);
  app.patch('/notifications/preferences', updatePreferencesHandler);
  app.post('/notifications/read-all', markAllReadHandler);
  app.post('/notifications/schedule-upcoming', scheduleUpcomingHandler);
  app.post('/notifications/activity-reminders', activityRemindersHandler);
  app.patch('/notifications/:id/read', markReadHandler);
}
