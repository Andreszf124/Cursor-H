import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';

/**
 * Handler global de errores — fail-secure (SECURITY.md §10).
 * Nunca expone stack traces, queries ni paths internos al cliente.
 */
export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (error instanceof AppError) {
    void reply
      .status(error.statusCode)
      .send({ error: { code: error.code, message: error.message } });
    return;
  }

  if (error instanceof ZodError) {
    void reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos de la solicitud inválidos',
        details: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  const statusCode = 'statusCode' in error ? error.statusCode : undefined;

  // Errores 4xx de Fastify/plugins (rate limit, payload too large, JSON inválido)
  if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
    const message =
      statusCode === 429
        ? 'Demasiadas solicitudes, intenta de nuevo más tarde'
        : statusCode === 413
          ? 'El archivo o payload excede el tamaño permitido'
          : 'Solicitud inválida';
    void reply.status(statusCode).send({ error: { code: 'REQUEST_ERROR', message } });
    return;
  }

  // Error interno: detalle solo en logs, respuesta genérica
  request.log.error(error);
  void reply
    .status(500)
    .send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
}
