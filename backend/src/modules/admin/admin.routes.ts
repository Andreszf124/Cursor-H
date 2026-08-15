import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import {
  blockUserHandler,
  getOwnQuotaHandler,
  listAuditLogsHandler,
  listIntegrationsHandler,
  listQuotasHandler,
  listUsersHandler,
  setStorageLimitHandler,
  updateRoleHandler,
} from './admin.handlers.js';

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  // Traza y cuota propias: cualquier usuario autenticado, filtradas por RLS
  app.get('/admin/audit-logs', listAuditLogsHandler);
  app.get('/admin/storage-quota', getOwnQuotaHandler);

  // Endpoints administrativos: exigen profiles.role = 'admin' en el service
  app.get('/admin/users', listUsersHandler);
  app.patch('/admin/users/:id/role', updateRoleHandler);
  app.patch('/admin/users/:id/block', blockUserHandler);
  app.get('/admin/integrations', listIntegrationsHandler);
  app.get('/admin/storage-quotas', listQuotasHandler);
  app.patch('/admin/storage-limits/:userId', setStorageLimitHandler);
}
