import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  askSchema,
  courseParamSchema,
  registerVideoSchema,
  timestampQuerySchema,
  uuidParamSchema,
} from './classes.schemas.js';
import { classesService } from './classes.service.js';

export async function registerVideoHandler(req: FastifyRequest, reply: FastifyReply) {
  const { courseId } = courseParamSchema.parse(req.params);
  const input = registerVideoSchema.parse(req.body);
  const transcript = await classesService.registerVideo(
    req.user.token,
    req.user.id,
    courseId,
    input,
  );
  await reply.status(201).send(transcript);
}

export async function listClassesHandler(req: FastifyRequest, reply: FastifyReply) {
  const courseId = (req.query as { course_id?: string } | undefined)?.course_id;
  const classes = await classesService.list(req.user.token, req.user.id, courseId);
  await reply.status(200).send({ classes });
}

export async function getTranscriptHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const transcript = await classesService.getTranscript(req.user.token, req.user.id, id);
  await reply.status(200).send(transcript);
}

export async function topicsHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const result = await classesService.topics(req.user.token, req.user.id, id);
  await reply.status(200).send(result);
}

export async function conceptsHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const result = await classesService.concepts(req.user.token, req.user.id, id);
  await reply.status(200).send(result);
}

export async function summaryHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const result = await classesService.summary(req.user.token, req.user.id, id);
  await reply.status(200).send(result);
}

export async function timestampHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const { concept } = timestampQuerySchema.parse(req.query ?? {});
  const result = await classesService.conceptTimestamp(req.user.token, req.user.id, id, concept);
  await reply.status(200).send(result);
}

export async function askHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const input = askSchema.parse(req.body);
  const result = await classesService.ask(req.user.token, req.user.id, id, input);
  await reply.status(201).send(result);
}
