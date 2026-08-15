import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  comprehensionSchema,
  createCheckinSchema,
  generateDiagnosticSchema,
  listCheckinsSchema,
  recordTopicsSchema,
  submitDiagnosticSchema,
  uuidParamSchema,
} from './checkins.schemas.js';
import { checkinsService } from './checkins.service.js';

export async function createCheckinHandler(req: FastifyRequest, reply: FastifyReply) {
  const input = createCheckinSchema.parse(req.body);
  const checkin = await checkinsService.create(req.user.token, req.user.id, input);
  await reply.status(201).send(checkin);
}

export async function listCheckinsHandler(req: FastifyRequest, reply: FastifyReply) {
  const params = listCheckinsSchema.parse(req.query ?? {});
  const checkins = await checkinsService.list(req.user.token, req.user.id, params);
  await reply.status(200).send({ checkins });
}

export async function getCheckinHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const checkin = await checkinsService.get(req.user.token, req.user.id, id);
  await reply.status(200).send(checkin);
}

export async function recordTopicsHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const input = recordTopicsSchema.parse(req.body);
  const topics = await checkinsService.recordTopics(req.user.token, req.user.id, id, input);
  await reply.status(200).send({ topics });
}

export async function recordComprehensionHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const input = comprehensionSchema.parse(req.body);
  const checkin = await checkinsService.recordComprehension(
    req.user.token,
    req.user.id,
    id,
    input,
  );
  await reply.status(200).send(checkin);
}

export async function generateDiagnosticHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const input = generateDiagnosticSchema.parse(req.body ?? {});
  const result = await checkinsService.generateDiagnostic(req.user.token, req.user.id, id, input);
  await reply.status(201).send(result);
}

export async function submitDiagnosticHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const input = submitDiagnosticSchema.parse(req.body);
  const result = await checkinsService.submitDiagnostic(req.user.token, req.user.id, id, input);
  await reply.status(200).send(result);
}

export async function completeCheckinHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const result = await checkinsService.complete(req.user.token, req.user.id, id);
  await reply.status(200).send(result);
}
