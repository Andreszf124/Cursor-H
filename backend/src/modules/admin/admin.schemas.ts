import { z } from 'zod';

export const listAuditLogsSchema = z.object({
  action: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const blockUserSchema = z.object({
  blocked: z.boolean(),
  reason: z.string().trim().max(500).optional(),
});

export const updateRoleSchema = z.object({
  role: z.enum(['student', 'admin']),
});

export const storageLimitSchema = z.object({
  limit_bytes: z.number().int().min(0).max(107_374_182_400),
});

export const uuidParamSchema = z.object({ id: z.uuid() });
export const userIdParamSchema = z.object({ userId: z.uuid() });
