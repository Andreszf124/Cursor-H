import type { FastifyReply, FastifyRequest } from 'fastify';
import { profileService } from '../profile/profile.service.js';

export async function completeOnboardingHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const profile = await profileService.completeOnboarding(request.user.token, request.user.id);
  await reply.status(200).send(profile);
}
