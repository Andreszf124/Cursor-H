import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  saveResourceSchema,
  searchResourcesSchema,
  uuidParamSchema,
} from './resources.schemas.js';
import { resourcesService } from './resources.service.js';

export async function searchResourcesHandler(req: FastifyRequest, reply: FastifyReply) {
  const params = searchResourcesSchema.parse(req.query ?? {});
  const resources = await resourcesService.search(req.user.token, req.user.id, params);
  await reply.status(200).send({ resources });
}

export async function saveResourceHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const input = saveResourceSchema.parse(req.body ?? {});
  const saved = await resourcesService.save(req.user.token, req.user.id, id, input);
  await reply.status(201).send(saved);
}

export async function listSavedResourcesHandler(req: FastifyRequest, reply: FastifyReply) {
  const saved = await resourcesService.listSaved(req.user.token, req.user.id);
  await reply.status(200).send({ saved });
}

export async function removeSavedResourceHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  await resourcesService.removeSaved(req.user.token, req.user.id, id);
  await reply.status(204).send();
}
