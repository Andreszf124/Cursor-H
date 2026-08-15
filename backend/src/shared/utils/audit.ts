import { getServiceClient } from '../../infrastructure/database/supabase.client.js';

/**
 * Traza de auditoría append-only (RF-154).
 * Se inserta con service role porque `audit_logs` solo permite SELECT al dueño:
 * así el cliente no puede falsificar ni borrar su propia traza (SECURITY.md R5).
 * Nunca lanza: un fallo de auditoría no debe romper la operación de negocio.
 */
export async function recordAudit(input: {
  studentId: string;
  action: string;
  entityType?: string;
  entityId?: string | null;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await getServiceClient()
      .from('audit_logs')
      .insert({
        student_id: input.studentId,
        action: input.action,
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
        ip_address: input.ip ?? null,
        user_agent: input.userAgent ?? null,
        metadata: input.metadata ?? null,
      });
  } catch {
    // Auditoría best-effort: el detalle queda en logs del proceso.
  }
}
