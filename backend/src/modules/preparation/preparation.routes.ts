import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import {
  generatePrePracticeHandler,
  nextClassHandler,
  upcomingClassesHandler,
} from './preparation.handlers.js';

export async function preparationRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/preparation/next-class', nextClassHandler);
  app.get('/preparation/upcoming', upcomingClassesHandler);
  app.post(
    '/preparation/generate-practice',
    { config: { rateLimit: { max: 20, timeWindow: '1 hour' } } },
    generatePrePracticeHandler,
  );
}
