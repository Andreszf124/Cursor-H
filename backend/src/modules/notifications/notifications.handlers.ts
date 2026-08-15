import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  listNotificationsSchema,
  updatePreferencesSchema,
  uuidParamSchema,
} from './notifications.schemas.js';
import { notificationsService } from './notifications.service.js';

export async function listNotificationsHandler(req: FastifyRequest, reply: FastifyReply) {
  const params = listNotificationsSchema.parse(req.query ?? {});
  const notifications = await notificationsService.list(req.user.token, req.user.id, params);
  await reply.status(200).send({ notifications });
}

export async function markReadHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const notification = await notificationsService.markRead(req.user.token, req.user.id, id);
  await reply.status(200).send(notification);
}

export async function markAllReadHandler(req: FastifyRequest, reply: FastifyReply) {
  await notificationsService.markAllRead(req.user.token, req.user.id);
  await reply.status(204).send();
}

export async function getPreferencesHandler(req: FastifyRequest, reply: FastifyReply) {
  const preferences = await notificationsService.getPreferences(req.user.token, req.user.id);
  await reply.status(200).send(preferences);
}

export async function updatePreferencesHandler(req: FastifyRequest, reply: FastifyReply) {
  const input = updatePreferencesSchema.parse(req.body);
  const preferences = await notificationsService.updatePreferences(
    req.user.token,
    req.user.id,
    input,
  );
  await reply.status(200).send(preferences);
}

export async function scheduleUpcomingHandler(req: FastifyRequest, reply: FastifyReply) {
  const result = await notificationsService.scheduleUpcoming(req.user.token, req.user.id);
  await reply.status(201).send(result);
}

export async function activityRemindersHandler(req: FastifyRequest, reply: FastifyReply) {
  const created = await notificationsService.createActivityReminders(req.user.token, req.user.id);
  await reply.status(201).send({ created: created.length });
}
