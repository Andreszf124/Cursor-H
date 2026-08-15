import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../../config/env.js';
import { UnauthorizedError } from '../../shared/errors/app-error.js';
import {
  deleteAccountSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from './auth.schemas.js';
import { authService } from './auth.service.js';

export async function registerHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const input = registerSchema.parse(request.body);
  const result = await authService.register(input);
  await reply.status(201).send(result);
}

export async function loginHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const input = loginSchema.parse(request.body);
  const result = await authService.login(input);
  await reply.status(200).send(result);
}

export async function logoutHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await authService.logout(request.user.token);
  await reply.status(204).send();
}

export async function forgotPasswordHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { email } = forgotPasswordSchema.parse(request.body);
  await authService.forgotPassword(email, `${env.FRONTEND_URL}/reset-password`);
  // Respuesta genérica: no revelar si el email existe (SECURITY.md §10)
  await reply
    .status(200)
    .send({ message: 'Si el correo existe, se envió un enlace de recuperación' });
}

export async function resetPasswordHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token de recuperación requerido');
  }
  const recoveryToken = header.slice('Bearer '.length);
  const { password } = resetPasswordSchema.parse(request.body);
  await authService.resetPassword(recoveryToken, password);
  await reply.status(200).send({ message: 'Contraseña actualizada correctamente' });
}

export async function deleteAccountHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { password } = deleteAccountSchema.parse(request.body);
  // userId y email SIEMPRE del JWT verificado — nunca del body (SECURITY.md R1)
  await authService.deleteAccount(request.user.id, request.user.email, password);
  await reply.status(204).send();
}
