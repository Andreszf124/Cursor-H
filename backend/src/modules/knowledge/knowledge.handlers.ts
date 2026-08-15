import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  createConceptSchema,
  createGapSchema,
  listConceptsSchema,
  recordMasterySchema,
  updateGapSchema,
  uuidParamSchema,
} from './knowledge.schemas.js';
import { knowledgeService } from './knowledge.service.js';

function query(req: FastifyRequest): Record<string, unknown> {
  return (req.query as Record<string, unknown> | undefined) ?? {};
}

export async function createConceptHandler(req: FastifyRequest, reply: FastifyReply) {
  const input = createConceptSchema.parse(req.body);
  const concept = await knowledgeService.createConcept(req.user.token, req.user.id, input);
  await reply.status(201).send(concept);
}

export async function listConceptsHandler(req: FastifyRequest, reply: FastifyReply) {
  const params = listConceptsSchema.parse(query(req));
  const concepts = await knowledgeService.listConcepts(req.user.token, req.user.id, params);
  await reply.status(200).send({ concepts });
}

export async function getConceptHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const concept = await knowledgeService.getConcept(req.user.token, req.user.id, id);
  await reply.status(200).send(concept);
}

export async function getMasteryHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const mastery = await knowledgeService.getMastery(req.user.token, req.user.id, id);
  await reply.status(200).send(mastery);
}

export async function recordMasteryHandler(req: FastifyRequest, reply: FastifyReply) {
  const input = recordMasterySchema.parse(req.body);
  const mastery = await knowledgeService.recordEvidence(req.user.token, req.user.id, input);
  await reply.status(201).send(mastery);
}

export async function masteryEvolutionHandler(req: FastifyRequest, reply: FastifyReply) {
  const conceptId = query(req).concept_id;
  const evolution = await knowledgeService.masteryEvolution(
    req.user.token,
    req.user.id,
    typeof conceptId === 'string' ? conceptId : undefined,
  );
  await reply.status(200).send({ evolution });
}

export async function listGapsHandler(req: FastifyRequest, reply: FastifyReply) {
  const status = query(req).status;
  const gaps = await knowledgeService.listGaps(
    req.user.token,
    req.user.id,
    typeof status === 'string' ? status : 'active',
  );
  await reply.status(200).send({ gaps });
}

export async function prioritizedGapsHandler(req: FastifyRequest, reply: FastifyReply) {
  const gaps = await knowledgeService.prioritizedGaps(req.user.token, req.user.id);
  await reply.status(200).send({ gaps });
}

export async function getGapHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const gap = await knowledgeService.getGap(req.user.token, req.user.id, id);
  await reply.status(200).send(gap);
}

export async function createGapHandler(req: FastifyRequest, reply: FastifyReply) {
  const input = createGapSchema.parse(req.body);
  const gap = await knowledgeService.createGap(req.user.token, req.user.id, input);
  await reply.status(201).send(gap);
}

export async function updateGapHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const input = updateGapSchema.parse(req.body);
  const gap = await knowledgeService.updateGap(req.user.token, req.user.id, id, input);
  await reply.status(200).send(gap);
}
