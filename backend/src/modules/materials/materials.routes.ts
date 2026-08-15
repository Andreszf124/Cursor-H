import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import {
  deleteMaterialHandler,
  getMaterialHandler,
  listMaterialsHandler,
  materialUrlHandler,
  searchMaterialsHandler,
  updateMaterialHandler,
  uploadMaterialHandler,
} from './materials.handlers.js';

export async function materialsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.post(
    '/materials',
    { config: { rateLimit: { max: 20, timeWindow: '1 hour' } } },
    uploadMaterialHandler,
  );
  app.get('/materials', listMaterialsHandler);
  // Antes de /materials/:id para que "search" no se interprete como un id
  app.get('/materials/search', searchMaterialsHandler);
  app.get('/materials/:id', getMaterialHandler);
  app.get('/materials/:id/url', materialUrlHandler);
  app.patch('/materials/:id', updateMaterialHandler);
  app.delete('/materials/:id', deleteMaterialHandler);
}
