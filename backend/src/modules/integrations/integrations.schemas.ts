import { z } from 'zod';

/**
 * REGLA CRÍTICA (RF-050, SECURITY.md §7): jamás se aceptan contraseñas.
 * Los objetos son estrictos: si el cliente envía `password` u otro campo
 * inesperado, la petición se rechaza con 400 en lugar de ignorarlo en silencio.
 */
export const connectCampusSchema = z.strictObject({
  campus_url: z.url(),
  username: z.string().trim().min(1).max(120),
  institution_name: z.string().trim().max(200).optional(),
});

export const connectTeamsSchema = z.strictObject({
  /** Identificador opaco de la cuenta en el proveedor — nunca un token */
  external_account_id: z.string().trim().min(1).max(200),
  tenant_name: z.string().trim().max(200).optional(),
});

export const teamsCallbackSchema = z.strictObject({
  code: z.string().trim().min(1).max(4000),
});

export const linkMeetingSchema = z.object({
  course_id: z.uuid(),
});

export const providerParamSchema = z.object({
  provider: z.enum(['campus', 'teams']),
});

export const uuidParamSchema = z.object({ id: z.uuid() });
export const meetingParamSchema = z.object({ id: z.string().trim().min(1).max(200) });
