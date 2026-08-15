import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { careerRoutes } from './modules/career/career.routes.js';
import { checkinsRoutes } from './modules/checkins/checkins.routes.js';
import { coursesRoutes } from './modules/courses/courses.routes.js';
import { curriculumRoutes } from './modules/curriculum/curriculum.routes.js';
import {
  adminRoutes,
  classesRoutes,
  learningPlansRoutes,
  preparationRoutes,
  resourcesRoutes,
} from './modules/fase2/fase2.routes.js';
import { integrationsRoutes } from './modules/integrations/integrations.routes.js';
import { onboardingRoutes } from './modules/onboarding/onboarding.routes.js';
import { knowledgeRoutes } from './modules/knowledge/knowledge.routes.js';
import { materialsRoutes } from './modules/materials/materials.routes.js';
import { notificationsRoutes } from './modules/notifications/notifications.routes.js';
import { practiceRoutes } from './modules/practice/practice.routes.js';
import { profileRoutes } from './modules/profile/profile.routes.js';
import { progressRoutes } from './modules/progress/progress.routes.js';
import { scheduleRoutes } from './modules/schedule/schedule.routes.js';
import { tutorRoutes } from './modules/tutor/tutor.routes.js';
import { errorHandler } from './shared/middleware/error-handler.js';

const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
  });

  app.setErrorHandler(errorHandler);

  const allowedOrigins = [...new Set([env.FRONTEND_URL, 'http://localhost:5173'])];
  await app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await app.register(multipart, {
    limits: { fileSize: MAX_UPLOAD_SIZE_BYTES, files: 1 },
  });

  app.get('/health', () => ({ status: 'ok' }));
  app.get('/health/ready', () => ({ status: 'ready' }));

  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(profileRoutes, { prefix: '/api/v1/profile' });
  await app.register(careerRoutes, { prefix: '/api/v1' });
  await app.register(curriculumRoutes, { prefix: '/api/v1' });
  await app.register(coursesRoutes, { prefix: '/api/v1' });
  await app.register(scheduleRoutes, { prefix: '/api/v1' });
  await app.register(materialsRoutes, { prefix: '/api/v1' });
  await app.register(notificationsRoutes, { prefix: '/api/v1' });
  await app.register(checkinsRoutes, { prefix: '/api/v1' });
  await app.register(knowledgeRoutes, { prefix: '/api/v1' });
  await app.register(tutorRoutes, { prefix: '/api/v1' });
  await app.register(practiceRoutes, { prefix: '/api/v1' });
  await app.register(progressRoutes, { prefix: '/api/v1' });
  await app.register(classesRoutes, { prefix: '/api/v1' });
  await app.register(learningPlansRoutes, { prefix: '/api/v1' });
  await app.register(resourcesRoutes, { prefix: '/api/v1' });
  await app.register(preparationRoutes, { prefix: '/api/v1' });
  await app.register(integrationsRoutes, { prefix: '/api/v1' });
  await app.register(onboardingRoutes, { prefix: '/api/v1' });
  await app.register(adminRoutes, { prefix: '/api/v1' });

  return app;
}
