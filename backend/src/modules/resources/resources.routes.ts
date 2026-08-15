import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import {
  listSavedResourcesHandler,
  removeSavedResourceHandler,
  saveResourceHandler,
  searchResourcesHandler,
} from './resources.handlers.js';

export async function resourcesRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/resources/search', searchResourcesHandler);
  app.get('/resources/saved', listSavedResourcesHandler);
  app.delete('/resources/saved/:id', removeSavedResourceHandler);
  app.post('/resources/:id/save', saveResourceHandler);
}
