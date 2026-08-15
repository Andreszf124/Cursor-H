import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import {
  createCheckinHandler,
  generateDiagnosticHandler,
  getCheckinHandler,
  listCheckinsHandler,
  recordComprehensionHandler,
  recordTopicsHandler,
  submitDiagnosticHandler,
  completeCheckinHandler,
} from './checkins.handlers.js';

export async function checkinsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.post('/checkins', createCheckinHandler);
  app.get('/checkins', listCheckinsHandler);
  app.get('/checkins/:id', getCheckinHandler);
  app.patch('/checkins/:id/topics', recordTopicsHandler);
  app.patch('/checkins/:id/comprehension', recordComprehensionHandler);
  app.post('/checkins/:id/complete', completeCheckinHandler);
  app.post(
    '/checkins/:id/diagnostic',
    { config: { rateLimit: { max: 20, timeWindow: '1 hour' } } },
    generateDiagnosticHandler,
  );
  app.post('/checkins/:id/diagnostic/submit', submitDiagnosticHandler);
}
