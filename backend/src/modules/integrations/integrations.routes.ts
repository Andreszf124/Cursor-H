import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import {
  connectCampusHandler,
  connectTeamsHandler,
  importCampusHandler,
  linkMeetingHandler,
  listIntegrationsHandler,
  listMeetingsHandler,
  teamsAuthUrlHandler,
  teamsCallbackHandler,
  teamsCoursesHandler,
} from './integrations.handlers.js';
import { integrationsService } from './integrations.service.js';

export async function integrationsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/integrations', listIntegrationsHandler);

  app.post('/integrations/campus/connect', connectCampusHandler);
  app.delete('/integrations/campus/disconnect', async (request, reply) => {
    const integration = await integrationsService.disconnect(
      request.user.token,
      request.user.id,
      'campus',
    );
    await reply.status(200).send(integration);
  });
  app.post('/integrations/campus/import', importCampusHandler);

  app.get('/integrations/teams/auth-url', teamsAuthUrlHandler);
  app.post('/integrations/teams/callback', teamsCallbackHandler);
  app.get('/integrations/teams/courses', teamsCoursesHandler);
  app.post('/integrations/teams/connect', connectTeamsHandler);
  app.delete('/integrations/teams/disconnect', async (request, reply) => {
    const integration = await integrationsService.disconnect(
      request.user.token,
      request.user.id,
      'teams',
    );
    await reply.status(200).send(integration);
  });
  app.get('/integrations/teams/meetings', listMeetingsHandler);
  app.patch('/integrations/teams/meetings/:id', linkMeetingHandler);
}
