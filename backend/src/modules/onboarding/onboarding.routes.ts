import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import { completeOnboardingHandler } from './onboarding.handlers.js';

export async function onboardingRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);
  app.post('/onboarding/complete', completeOnboardingHandler);
}
