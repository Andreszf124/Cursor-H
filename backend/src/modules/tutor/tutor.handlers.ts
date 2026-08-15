import type { FastifyReply, FastifyRequest } from 'fastify';
import { chatSchema, createConversationSchema, uuidParamSchema } from './tutor.schemas.js';
import { tutorService } from './tutor.service.js';

export async function createConversationHandler(req: FastifyRequest, reply: FastifyReply) {
  const input = createConversationSchema.parse(req.body ?? {});
  const conversation = await tutorService.createConversation(req.user.token, req.user.id, input);
  await reply.status(201).send(conversation);
}

export async function listConversationsHandler(req: FastifyRequest, reply: FastifyReply) {
  const conversations = await tutorService.listConversations(req.user.token, req.user.id);
  await reply.status(200).send({ conversations });
}

export async function listMessagesHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const messages = await tutorService.listMessages(req.user.token, req.user.id, id);
  await reply.status(200).send({ messages });
}

export async function chatHandler(req: FastifyRequest, reply: FastifyReply) {
  const input = chatSchema.parse(req.body);
  const result = await tutorService.chat(req.user.token, req.user.id, input);
  await reply.status(201).send(result);
}
