import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import {
  confirmImportHandler,
  getImportHandler,
  getInconsistenciesHandler,
  getPrerequisitesHandler,
  importCurriculumHandler,
  listImportsHandler,
  listSubjectsHandler,
  updateImportHandler,
} from './curriculum.handlers.js';

export async function curriculumRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  // La extracción con IA es costosa: 5 importaciones por hora (SECURITY.md §8)
  app.post(
    '/curriculum/import',
    { config: { rateLimit: { max: 5, timeWindow: '1 hour' } } },
    importCurriculumHandler,
  );

  app.get('/curriculum/imports', listImportsHandler);
  app.get('/curriculum/imports/:id', getImportHandler);
  app.patch('/curriculum/imports/:id', updateImportHandler);
  app.post('/curriculum/imports/:id/confirm', confirmImportHandler);
  app.get('/curriculum/imports/:id/inconsistencies', getInconsistenciesHandler);

  app.get('/subjects', listSubjectsHandler);
  app.get('/subjects/:id/prerequisites', getPrerequisitesHandler);
}
