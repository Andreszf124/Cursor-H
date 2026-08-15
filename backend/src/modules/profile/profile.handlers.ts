import type { FastifyReply, FastifyRequest } from 'fastify';
import { ValidationError } from '../../shared/errors/app-error.js';
import { updatePreferencesSchema, updateProfileSchema } from './profile.schemas.js';
import { profileService } from './profile.service.js';

/** Identidad SIEMPRE desde request.user (JWT verificado) — nunca del body (SECURITY.md R1) */

export async function getProfileHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const profile = await profileService.getProfile(request.user.token, request.user.id);
  await reply.status(200).send(profile);
}

export async function updateProfileHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const input = updateProfileSchema.parse(request.body);
  const profile = await profileService.updateProfile(request.user.token, request.user.id, input);
  await reply.status(200).send(profile);
}

export async function uploadAvatarHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const file = await request.file();
  if (!file) {
    throw new ValidationError('Se requiere un archivo de imagen');
  }

  // toBuffer lanza 413 si excede el límite de 2MB configurado en el plugin
  const buffer = await file.toBuffer();
  const result = await profileService.uploadAvatar(
    request.user.token,
    request.user.id,
    buffer,
    file.mimetype,
  );
  await reply.status(200).send(result);
}

export async function deleteAvatarHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await profileService.deleteAvatar(request.user.token, request.user.id);
  await reply.status(204).send();
}

export async function getPreferencesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const preferences = await profileService.getPreferences(request.user.token, request.user.id);
  await reply.status(200).send({ preferences });
}

export async function updatePreferencesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const input = updatePreferencesSchema.parse(request.body);
  const preferences = await profileService.updatePreferences(
    request.user.token,
    request.user.id,
    input,
  );
  await reply.status(200).send({ preferences });
}
