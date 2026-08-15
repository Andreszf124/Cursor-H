import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  connectCampusSchema,
  connectTeamsSchema,
  linkMeetingSchema,
  meetingParamSchema,
  teamsCallbackSchema,
} from './integrations.schemas.js';
import { integrationsService } from './integrations.service.js';

export async function listIntegrationsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const integrations = await integrationsService.list(request.user.token, request.user.id);
  await reply.status(200).send({ integrations });
}

export async function connectCampusHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  integrationsService.rejectPasswords(request.body);
  const input = connectCampusSchema.parse(request.body);
  const integration = await integrationsService.connectCampus(
    request.user.token,
    request.user.id,
    input,
  );
  await reply.status(200).send(integration);
}

export async function connectTeamsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  integrationsService.rejectPasswords(request.body);
  const input = connectTeamsSchema.parse(request.body);
  const integration = await integrationsService.connectTeams(
    request.user.token,
    request.user.id,
    input,
  );
  await reply.status(200).send(integration);
}

export async function importCampusHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  integrationsService.rejectPasswords(request.body);
  const result = await integrationsService.importFromCampus(request.user.token, request.user.id);
  await reply.status(200).send(result);
}

export async function teamsAuthUrlHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await reply.status(200).send(integrationsService.getTeamsAuthUrl());
}

export async function teamsCallbackHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  integrationsService.rejectPasswords(request.body);
  const { code } = teamsCallbackSchema.parse(request.body);
  const integration = await integrationsService.handleTeamsCallback(
    request.user.token,
    request.user.id,
    code,
  );
  await reply.status(200).send(integration);
}

export async function teamsCoursesHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await reply.status(200).send(integrationsService.listTeamsCourses());
}

export async function listMeetingsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const result = await integrationsService.listMeetings(request.user.token, request.user.id);
  await reply.status(200).send(result);
}

export async function linkMeetingHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = meetingParamSchema.parse(request.params);
  const input = linkMeetingSchema.parse(request.body);
  const result = await integrationsService.linkMeeting(
    request.user.token,
    request.user.id,
    id,
    input,
  );
  await reply.status(200).send(result);
}
