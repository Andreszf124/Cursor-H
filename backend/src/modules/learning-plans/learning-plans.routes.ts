import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import {
  activePlanHandler,
  adjustPlanHandler,
  completeActivityHandler,
  generatePlanHandler,
  listPlansHandler,
} from './learning-plans.handlers.js';

export async function learningPlansRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/learning-plans', listPlansHandler);
  app.post(
    '/learning-plans/generate',
    { config: { rateLimit: { max: 20, timeWindow: '1 hour' } } },
    generatePlanHandler,
  );
  app.get('/learning-plans/active', activePlanHandler);
  app.patch('/learning-plans/activities/:id/complete', completeActivityHandler);
  app.post('/learning-plans/:id/adjust', adjustPlanHandler);
}
