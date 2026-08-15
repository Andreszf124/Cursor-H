import type { FastifyReply, FastifyRequest } from 'fastify';
import { generatePlanSchema, uuidParamSchema } from './learning-plans.schemas.js';
import { learningPlansService } from './learning-plans.service.js';

export async function generatePlanHandler(req: FastifyRequest, reply: FastifyReply) {
  const input = generatePlanSchema.parse(req.body ?? {});
  const result = await learningPlansService.generate(req.user.token, req.user.id, input);
  await reply.status(201).send(result);
}

export async function listPlansHandler(req: FastifyRequest, reply: FastifyReply) {
  const plans = await learningPlansService.listPlans(req.user.token, req.user.id);
  await reply.status(200).send({ plans });
}

export async function activePlanHandler(req: FastifyRequest, reply: FastifyReply) {
  const result = await learningPlansService.active(req.user.token, req.user.id);
  await reply.status(200).send(result);
}

export async function completeActivityHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const activity = await learningPlansService.completeActivity(req.user.token, req.user.id, id);
  await reply.status(200).send(activity);
}

export async function adjustPlanHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const result = await learningPlansService.adjust(req.user.token, req.user.id, id);
  await reply.status(201).send(result);
}
