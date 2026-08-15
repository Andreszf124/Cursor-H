import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import {
  createConceptHandler,
  createGapHandler,
  getConceptHandler,
  getGapHandler,
  getMasteryHandler,
  listConceptsHandler,
  listGapsHandler,
  masteryEvolutionHandler,
  prioritizedGapsHandler,
  recordMasteryHandler,
  updateGapHandler,
} from './knowledge.handlers.js';

export async function knowledgeRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/concepts', listConceptsHandler);
  app.post('/concepts', createConceptHandler);
  app.get('/concepts/:id', getConceptHandler);
  app.get('/concepts/:id/mastery', getMasteryHandler);

  app.get('/mastery/evolution', masteryEvolutionHandler);
  app.post('/mastery', recordMasteryHandler);

  app.get('/knowledge-gaps', listGapsHandler);
  app.get('/knowledge-gaps/prioritized', prioritizedGapsHandler);
  app.post('/knowledge-gaps', createGapHandler);
  app.get('/knowledge-gaps/:id', getGapHandler);
  app.patch('/knowledge-gaps/:id', updateGapHandler);
}
