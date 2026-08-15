import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  generatePracticeSchema,
  listPracticesSchema,
  submitExerciseSchema,
  uuidParamSchema,
} from './practice.schemas.js';
import { practiceService } from './practice.service.js';

export async function generatePracticeHandler(req: FastifyRequest, reply: FastifyReply) {
  const input = generatePracticeSchema.parse(req.body ?? {});
  const result = await practiceService.generate(req.user.token, req.user.id, input);
  await reply.status(201).send(result);
}

export async function listPracticesHandler(req: FastifyRequest, reply: FastifyReply) {
  const { course_id } = listPracticesSchema.parse(req.query ?? {});
  const practices = await practiceService.list(req.user.token, req.user.id, course_id);
  await reply.status(200).send({ practices });
}

export async function getPracticeHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const practice = await practiceService.get(req.user.token, req.user.id, id);
  await reply.status(200).send(practice);
}

export async function submitExerciseHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const input = submitExerciseSchema.parse(req.body);
  const attempt = await practiceService.submitExercise(req.user.token, req.user.id, id, input);
  await reply.status(201).send(attempt);
}

export async function completePracticeHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const practice = await practiceService.complete(req.user.token, req.user.id, id);
  await reply.status(200).send(practice);
}
