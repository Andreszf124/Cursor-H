import type { FastifyReply, FastifyRequest } from 'fastify';
import { progressService } from './progress.service.js';
import { byConceptQuerySchema } from './progress.schemas.js';

export async function overviewHandler(req: FastifyRequest, reply: FastifyReply) {
  const overview = await progressService.overview(req.user.token, req.user.id);
  await reply.status(200).send(overview);
}

export async function bySubjectHandler(req: FastifyRequest, reply: FastifyReply) {
  const subjects = await progressService.bySubject(req.user.token, req.user.id);
  await reply.status(200).send({ subjects });
}

export async function byConceptHandler(req: FastifyRequest, reply: FastifyReply) {
  const { course_id } = byConceptQuerySchema.parse(req.query ?? {});
  const concepts = await progressService.byConcept(req.user.token, req.user.id, course_id);
  await reply.status(200).send({ concepts });
}

export async function assessmentsHandler(req: FastifyRequest, reply: FastifyReply) {
  const assessments = await progressService.assessments(req.user.token, req.user.id);
  await reply.status(200).send({ assessments });
}

export async function evolutionHandler(req: FastifyRequest, reply: FastifyReply) {
  const evolution = await progressService.evolution(req.user.token, req.user.id);
  await reply.status(200).send({ evolution });
}

export async function difficultSubjectsHandler(req: FastifyRequest, reply: FastifyReply) {
  const subjects = await progressService.difficultSubjects(req.user.token, req.user.id);
  await reply.status(200).send({ subjects });
}

export async function activitiesHandler(req: FastifyRequest, reply: FastifyReply) {
  const activities = await progressService.activities(req.user.token, req.user.id);
  await reply.status(200).send(activities);
}

export async function studyTimeHandler(req: FastifyRequest, reply: FastifyReply) {
  const studyTime = await progressService.studyTime(req.user.token, req.user.id);
  await reply.status(200).send(studyTime);
}
