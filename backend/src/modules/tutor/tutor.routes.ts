import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import {
  chatHandler,
  createConversationHandler,
  listConversationsHandler,
  listMessagesHandler,
} from './tutor.handlers.js';

export async function tutorRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.post('/tutor/conversations', createConversationHandler);
  app.get('/tutor/conversations', listConversationsHandler);
  app.get('/tutor/conversations/:id/messages', listMessagesHandler);
  // Límite propio: cada turno consume cuota del proveedor de IA
  app.post(
    '/tutor/chat',
    { config: { rateLimit: { max: 30, timeWindow: '1 hour' } } },
    chatHandler,
  );
}
