import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import {
  completePracticeHandler,
  generatePracticeHandler,
  getPracticeHandler,
  listPracticesHandler,
  submitExerciseHandler,
} from './practice.handlers.js';

export async function practiceRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.post(
    '/practice/generate',
    { config: { rateLimit: { max: 20, timeWindow: '1 hour' } } },
    generatePracticeHandler,
  );
  app.get('/practice', listPracticesHandler);
  app.post('/practice/exercises/:id/submit', submitExerciseHandler);
  app.get('/practice/:id', getPracticeHandler);
  app.post('/practice/:id/complete', completePracticeHandler);
}
