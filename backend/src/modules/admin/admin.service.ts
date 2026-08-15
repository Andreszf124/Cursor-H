import type { z } from 'zod';
import {
  createUserClient,
  getServiceClient,
} from '../../infrastructure/database/supabase.client.js';
import { AppError, ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';
import { recordAudit } from '../../shared/utils/audit.js';
import type {
  blockUserSchema,
  listAuditLogsSchema,
  storageLimitSchema,
  updateRoleSchema,
} from './admin.schemas.js';

type ListAuditLogs = z.infer<typeof listAuditLogsSchema>;
type BlockUser = z.infer<typeof blockUserSchema>;
type UpdateRole = z.infer<typeof updateRoleSchema>;
type StorageLimit = z.infer<typeof storageLimitSchema>;

export class AdminService {
  /**
   * RF-154 — la traza propia del estudiante.
   * RLS solo permite SELECT de las filas con student_id = auth.uid(), así que
   * este endpoint es seguro para cualquier usuario autenticado.
   */
  async listOwnAuditLogs(token: string, userId: string, params: ListAuditLogs) {
    const supabase = createUserClient(token);
    let query = supabase
      .from('audit_logs')
      .select('id, action, entity_type, entity_id, created_at, metadata')
      .eq('student_id', userId);
    if (params.action) query = query.eq('action', params.action);

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(params.limit);
    if (error) throw new AppError('No se pudo obtener la auditoría', 500, 'DB_ERROR');
    return data ?? [];
  }

  /** Cuota de almacenamiento propia (RF-157, vista del estudiante) */
  async getOwnQuota(token: string, userId: string) {
    const supabase = createUserClient(token);
    const { data } = await supabase
      .from('storage_quotas')
      .select('*')
      .eq('student_id', userId)
      .maybeSingle();
    return data ?? { student_id: userId, limit_bytes: 524_288_000, used_bytes: 0 };
  }

  /** Verificación de rol para los endpoints administrativos (RF-152) */
  async assertAdmin(token: string, userId: string): Promise<void> {
    const supabase = createUserClient(token);
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (!data || data.role !== 'admin') {
      throw new ForbiddenError();
    }
  }

  /** RF-152 — listado de usuarios (service role: cruza todos los tenants) */
  async listUsers(token: string, userId: string, limit = 50) {
    await this.assertAdmin(token, userId);
    const { data, error } = await getServiceClient()
      .from('profiles')
      .select('id, full_name, language, role, blocked_at, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new AppError('No se pudieron listar usuarios', 500, 'DB_ERROR');
    return data ?? [];
  }

  /** RF-153 */
  async updateRole(token: string, adminId: string, targetId: string, input: UpdateRole) {
    await this.assertAdmin(token, adminId);
    const { data, error } = await getServiceClient()
      .from('profiles')
      .update({ role: input.role })
      .eq('id', targetId)
      .select('id, role')
      .single();
    if (error || !data) throw new NotFoundError('Usuario no encontrado');

    await recordAudit({
      studentId: adminId,
      action: 'admin.role.update',
      entityType: 'profile',
      entityId: targetId,
      metadata: { role: input.role },
    });
    return data;
  }

  /** RF-155 — bloqueo lógico: profiles.blocked_at corta el acceso de la app */
  async blockUser(token: string, adminId: string, targetId: string, input: BlockUser) {
    await this.assertAdmin(token, adminId);
    const { data, error } = await getServiceClient()
      .from('profiles')
      .update({ blocked_at: input.blocked ? new Date().toISOString() : null })
      .eq('id', targetId)
      .select('id, blocked_at')
      .single();
    if (error || !data) throw new NotFoundError('Usuario no encontrado');

    await recordAudit({
      studentId: adminId,
      action: input.blocked ? 'admin.user.block' : 'admin.user.unblock',
      entityType: 'profile',
      entityId: targetId,
      metadata: input.reason ? { reason: input.reason } : undefined,
    });
    return data;
  }

  /** RF-156 — estado de integraciones, sin credenciales (nunca se almacenan) */
  async listIntegrations(token: string, adminId: string, limit = 100) {
    await this.assertAdmin(token, adminId);
    const { data, error } = await getServiceClient()
      .from('integrations')
      .select('id, student_id, provider, status, connected_at, disconnected_at')
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (error) throw new AppError('No se pudieron listar integraciones', 500, 'DB_ERROR');
    return data ?? [];
  }

  /** RF-157 */
  async listQuotas(token: string, adminId: string, limit = 100) {
    await this.assertAdmin(token, adminId);
    const { data, error } = await getServiceClient()
      .from('storage_quotas')
      .select('id, student_id, limit_bytes, used_bytes, updated_at')
      .order('used_bytes', { ascending: false })
      .limit(limit);
    if (error) throw new AppError('No se pudieron listar cuotas', 500, 'DB_ERROR');
    return data ?? [];
  }

  async setStorageLimit(
    token: string,
    adminId: string,
    targetId: string,
    input: StorageLimit,
  ) {
    await this.assertAdmin(token, adminId);
    const { data, error } = await getServiceClient()
      .from('storage_quotas')
      .upsert(
        { student_id: targetId, limit_bytes: input.limit_bytes },
        { onConflict: 'student_id' },
      )
      .select('*')
      .single();
    if (error || !data) throw new AppError('No se pudo actualizar la cuota', 500, 'DB_ERROR');

    await recordAudit({
      studentId: adminId,
      action: 'admin.storage.limit',
      entityType: 'storage_quota',
      entityId: targetId,
      metadata: { limit_bytes: input.limit_bytes },
    });
    return data;
  }
}

export const adminService = new AdminService();
