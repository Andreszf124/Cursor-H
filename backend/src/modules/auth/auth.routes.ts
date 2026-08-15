import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import {
  deleteAccountHandler,
  forgotPasswordHandler,
  loginHandler,
  logoutHandler,
  registerHandler,
  resetPasswordHandler,
} from './auth.handlers.js';

/** Rate limits por endpoint según SECURITY.md §8 */
export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/register',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    registerHandler,
  );

  app.post('/login', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, loginHandler);

  app.post('/logout', { preHandler: requireAuth }, logoutHandler);

  app.post(
    '/forgot-password',
    { config: { rateLimit: { max: 3, timeWindow: '1 minute' } } },
    forgotPasswordHandler,
  );

  app.post('/reset-password', resetPasswordHandler);

  app.delete('/account', { preHandler: requireAuth }, deleteAccountHandler);
}
