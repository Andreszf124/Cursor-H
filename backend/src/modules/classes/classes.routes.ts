import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import {
  askHandler,
  conceptsHandler,
  getTranscriptHandler,
  listClassesHandler,
  registerVideoHandler,
  summaryHandler,
  timestampHandler,
  topicsHandler,
} from './classes.handlers.js';

export async function classesRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/classes', listClassesHandler);
  app.post('/classes/:courseId/videos', registerVideoHandler);
  app.get('/classes/videos/:id/transcript', getTranscriptHandler);
  app.get('/classes/videos/:id/topics', topicsHandler);
  app.get('/classes/videos/:id/concepts', conceptsHandler);
  app.get('/classes/videos/:id/summary', summaryHandler);
  app.get('/classes/videos/:id/timestamp', timestampHandler);
  app.post(
    '/classes/videos/:id/ask',
    { config: { rateLimit: { max: 30, timeWindow: '1 hour' } } },
    askHandler,
  );
}
