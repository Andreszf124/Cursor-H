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

export type PublicEnv = z.infer<typeof envSchema>;

const publicEnv = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_API_URL: import.meta.env.VITE_API_URL,
};

const parsed = envSchema.safeParse(publicEnv);

export const missingPublicEnvKeys = parsed.success
  ? []
  : parsed.error.issues.map((issue) => String(issue.path[0] ?? 'unknown'));

const unconfiguredFallback: PublicEnv = {
  VITE_SUPABASE_URL: 'https://missing-env.invalid',
  VITE_SUPABASE_ANON_KEY: 'missing',
  VITE_API_URL: 'https://missing-env.invalid',
};

export const env: PublicEnv = parsed.data ?? unconfiguredFallback;
