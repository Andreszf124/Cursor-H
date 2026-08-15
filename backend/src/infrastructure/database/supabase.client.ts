import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../config/env.js';

/**
 * Cliente Supabase con el JWT del usuario autenticado.
 * TODAS las queries a datos de estudiante deben usar este cliente:
 * respeta RLS y garantiza aislamiento por auth.uid() (SECURITY.md R1).
 */
export function createUserClient(accessToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let anonClient: SupabaseClient | null = null;

/**
 * Cliente anónimo sin sesión — para operaciones de Supabase Auth
 * (signUp, signIn, getUser, resetPasswordForEmail). No accede a datos RLS.
 */
export function getAnonClient(): SupabaseClient {
  anonClient ??= createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return anonClient;
}

let serviceClient: SupabaseClient | null = null;

/**
 * Cliente con service role — BYPASSA RLS.
 * Uso restringido (SECURITY.md R5): jobs asíncronos, inserts de auditoría
 * y operaciones admin. PROHIBIDO usarlo para queries de datos de estudiante
 * en el flujo de un request de usuario.
 */
export function getServiceClient(): SupabaseClient {
  serviceClient ??= createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return serviceClient;
}
