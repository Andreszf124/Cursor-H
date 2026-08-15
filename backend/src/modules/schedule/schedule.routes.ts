import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import {
  createScheduleHandler,
  deleteScheduleHandler,
  getScheduleHandler,
  getUpcomingHandler,
  listSchedulesHandler,
  updateScheduleHandler,
} from './schedule.handlers.js';

export async function scheduleRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/schedules', listSchedulesHandler);
  app.post('/schedules', createScheduleHandler);
  // Ruta estática antes del parámetro para que no la capture /schedules/:id
  app.get('/schedules/upcoming', getUpcomingHandler);
  app.get('/schedules/:id', getScheduleHandler);
  app.patch('/schedules/:id', updateScheduleHandler);
  app.delete('/schedules/:id', deleteScheduleHandler);
}
