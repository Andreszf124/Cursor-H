import type { FastifyRequest } from 'fastify';
import { getAnonClient } from '../../infrastructure/database/supabase.client.js';
import { UnauthorizedError } from '../errors/app-error.js';

export interface AuthUser {
  id: string;
  email: string;
  /** JWT verificado — se usa para crear el cliente RLS del request */
  token: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser;
  }
}

/**
 * preHandler de autenticación (SECURITY.md §3.2).
 * Verifica el Bearer JWT contra Supabase Auth y adjunta request.user.
 * REGLA CRÍTICA: el student_id SIEMPRE sale de aquí (JWT verificado),
 * NUNCA del body, query ni params (SECURITY.md R1).
 */
export async function requireAuth(request: FastifyRequest): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError();
  }

  const token = header.slice('Bearer '.length);
  const { data, error } = await getAnonClient().auth.getUser(token);

  if (error || !data.user) {
    throw new UnauthorizedError();
  }

  request.user = {
    id: data.user.id,
    email: data.user.email ?? '',
    token,
  };
}
