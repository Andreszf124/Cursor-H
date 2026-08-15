import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  blockUserSchema,
  listAuditLogsSchema,
  storageLimitSchema,
  updateRoleSchema,
  userIdParamSchema,
  uuidParamSchema,
} from './admin.schemas.js';
import { adminService } from './admin.service.js';

export async function listAuditLogsHandler(req: FastifyRequest, reply: FastifyReply) {
  const params = listAuditLogsSchema.parse(req.query ?? {});
  const logs = await adminService.listOwnAuditLogs(req.user.token, req.user.id, params);
  await reply.status(200).send({ logs });
}

export async function getOwnQuotaHandler(req: FastifyRequest, reply: FastifyReply) {
  const quota = await adminService.getOwnQuota(req.user.token, req.user.id);
  await reply.status(200).send(quota);
}

export async function listUsersHandler(req: FastifyRequest, reply: FastifyReply) {
  const users = await adminService.listUsers(req.user.token, req.user.id);
  await reply.status(200).send({ users });
}

export async function updateRoleHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const input = updateRoleSchema.parse(req.body);
  const profile = await adminService.updateRole(req.user.token, req.user.id, id, input);
  await reply.status(200).send(profile);
}

export async function blockUserHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const input = blockUserSchema.parse(req.body);
  const profile = await adminService.blockUser(req.user.token, req.user.id, id, input);
  await reply.status(200).send(profile);
}

export async function listIntegrationsHandler(req: FastifyRequest, reply: FastifyReply) {
  const integrations = await adminService.listIntegrations(req.user.token, req.user.id);
  await reply.status(200).send({ integrations });
}

export async function listQuotasHandler(req: FastifyRequest, reply: FastifyReply) {
  const quotas = await adminService.listQuotas(req.user.token, req.user.id);
  await reply.status(200).send({ quotas });
}

export async function setStorageLimitHandler(req: FastifyRequest, reply: FastifyReply) {
  const { userId } = userIdParamSchema.parse(req.params);
  const input = storageLimitSchema.parse(req.body);
  const quota = await adminService.setStorageLimit(req.user.token, req.user.id, userId, input);
  await reply.status(200).send(quota);
}
