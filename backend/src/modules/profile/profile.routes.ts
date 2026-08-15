import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import {
  deleteAvatarHandler,
  getPreferencesHandler,
  getProfileHandler,
  updatePreferencesHandler,
  updateProfileHandler,
  uploadAvatarHandler,
} from './profile.handlers.js';

/** Todas las rutas de perfil requieren autenticación (RF-010) */
export async function profileRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/', getProfileHandler);
  app.patch('/', updateProfileHandler);
  app.post('/avatar', uploadAvatarHandler);
  app.delete('/avatar', deleteAvatarHandler);
  app.get('/preferences', getPreferencesHandler);
  app.patch('/preferences', updatePreferencesHandler);
}
