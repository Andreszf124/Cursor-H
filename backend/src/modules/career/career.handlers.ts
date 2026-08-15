import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  createInstitutionSchema,
  createPeriodSchema,
  listCareersQuerySchema,
  setupCareerSchema,
  subjectStatusSchema,
  uuidParamSchema,
} from './career.schemas.js';
import { careerService } from './career.service.js';

export async function listInstitutionsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const search =
    typeof request.query === 'object' &&
    request.query !== null &&
    'q' in request.query &&
    typeof (request.query as { q?: unknown }).q === 'string'
      ? (request.query as { q: string }).q
      : undefined;
  const institutions = await careerService.listInstitutions(request.user.token, search);
  await reply.status(200).send({ institutions });
}

export async function createInstitutionHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const input = createInstitutionSchema.parse(request.body);
  const institution = await careerService.createInstitution(
    request.user.token,
    request.user.id,
    input,
  );
  await reply.status(201).send(institution);
}

export async function listCareersHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { institution_id } = listCareersQuerySchema.parse(request.query);
  const careers = await careerService.listCareers(request.user.token, institution_id);
  await reply.status(200).send({ careers });
}

export async function setupCareerHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const input = setupCareerSchema.parse(request.body);
  const result = await careerService.setupCareer(request.user.token, request.user.id, input);
  await reply.status(201).send(result);
}

export async function getCareerHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const career = await careerService.getActiveCareer(request.user.token, request.user.id);
  await reply.status(200).send({ career });
}

export async function createPeriodHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const input = createPeriodSchema.parse(request.body);
  const period = await careerService.createPeriod(request.user.token, request.user.id, input);
  await reply.status(201).send(period);
}

export async function listPeriodsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const periods = await careerService.listPeriods(request.user.token, request.user.id);
  await reply.status(200).send({ periods });
}

export async function activatePeriodHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = uuidParamSchema.parse(request.params);
  const period = await careerService.activatePeriod(request.user.token, request.user.id, id);
  await reply.status(200).send(period);
}

export async function getHistoryHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const history = await careerService.getHistory(request.user.token, request.user.id);
  await reply.status(200).send({ history });
}

export async function updateSubjectStatusHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = uuidParamSchema.parse(request.params);
  const input = subjectStatusSchema.parse(request.body);
  const status = await careerService.updateSubjectStatus(
    request.user.token,
    request.user.id,
    id,
    input,
  );
  await reply.status(200).send(status);
}

export async function getProgressHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const progress = await careerService.calculateProgress(request.user.token, request.user.id);
  await reply.status(200).send(progress);
}
