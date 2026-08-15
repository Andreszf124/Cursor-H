import { z } from 'zod';

/**
 * Variables de entorno públicas del frontend.
 * Solo variables VITE_* — cualquier valor aquí es visible en el bundle del navegador.
 * NUNCA agregar la service role key ni otros secretos (SECURITY.md R5).
 */
const envSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  VITE_API_URL: z.url(),
});

export const env = envSchema.parse(import.meta.env);
