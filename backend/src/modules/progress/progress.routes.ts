import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import {
  activitiesHandler,
  assessmentsHandler,
  byConceptHandler,
  bySubjectHandler,
  difficultSubjectsHandler,
  evolutionHandler,
  overviewHandler,
  studyTimeHandler,
} from './progress.handlers.js';

export async function progressRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/progress/overview', overviewHandler);
  app.get('/progress/by-subject', bySubjectHandler);
  app.get('/progress/by-concept', byConceptHandler);
  app.get('/progress/assessments', assessmentsHandler);
  app.get('/progress/evolution', evolutionHandler);
  app.get('/progress/difficult-subjects', difficultSubjectsHandler);
  app.get('/progress/activities', activitiesHandler);
  app.get('/progress/study-time', studyTimeHandler);
}
