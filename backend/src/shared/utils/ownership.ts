import type { SupabaseClient } from '@supabase/supabase-js';
import { NotFoundError } from '../errors/app-error.js';

/**
 * Verifica que una fila referenciada pertenezca al estudiante del JWT.
 * Recurso ajeno o inexistente responde 404 (nunca 403) para no permitir
 * enumeración de IDs (SECURITY.md R1).
 */
export async function assertOwnedRow(
  supabase: SupabaseClient,
  table: string,
  id: string,
  userId: string,
  notFoundMessage: string,
): Promise<void> {
  const { data } = await supabase
    .from(table)
    .select('id')
    .eq('id', id)
    .eq('student_id', userId)
    .maybeSingle();

  if (!data) throw new NotFoundError(notFoundMessage);
}
