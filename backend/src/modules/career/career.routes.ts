import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import {
  activatePeriodHandler,
  createInstitutionHandler,
  createPeriodHandler,
  getCareerHandler,
  getHistoryHandler,
  getProgressHandler,
  listCareersHandler,
  listInstitutionsHandler,
  listPeriodsHandler,
  setupCareerHandler,
  updateSubjectStatusHandler,
} from './career.handlers.js';

export async function careerRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/institutions', listInstitutionsHandler);
  app.post(
    '/institutions',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    createInstitutionHandler,
  );

  app.get('/careers', listCareersHandler);
  app.post('/career/setup', setupCareerHandler);
  app.get('/career', getCareerHandler);

  app.post('/academic-periods', createPeriodHandler);
  app.get('/academic-periods', listPeriodsHandler);
  app.patch('/academic-periods/:id/activate', activatePeriodHandler);

  app.get('/academic-history', getHistoryHandler);
  app.post('/subjects/:id/status', updateSubjectStatusHandler);
  app.get('/academic-progress', getProgressHandler);
}
