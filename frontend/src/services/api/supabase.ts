import { createClient } from '@supabase/supabase-js';
import { env } from '../../app/config/env';

/**
 * Cliente Supabase del frontend — SOLO anon key.
 * Las queries a datos de estudiante pasan por RLS con el JWT de la sesión.
 * Operaciones privilegiadas van siempre al backend via /api/v1.
 */
export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
