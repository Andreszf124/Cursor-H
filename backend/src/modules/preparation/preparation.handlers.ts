import type { FastifyReply, FastifyRequest } from 'fastify';
import { preparationService } from './preparation.service.js';

export async function nextClassHandler(req: FastifyRequest, reply: FastifyReply) {
  const preparation = await preparationService.nextClass(req.user.token, req.user.id);
  await reply.status(200).send(preparation);
}

export async function generatePrePracticeHandler(req: FastifyRequest, reply: FastifyReply) {
  const result = await preparationService.generatePractice(req.user.token, req.user.id);
  await reply.status(201).send(result);
}

export async function upcomingClassesHandler(req: FastifyRequest, reply: FastifyReply) {
  const upcoming = await preparationService.upcomingClasses(req.user.token, req.user.id);
  await reply.status(200).send({ upcoming });
}
