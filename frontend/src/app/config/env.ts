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

// #region agent log
fetch('http://127.0.0.1:7774/ingest/f4cb5b74-6463-4ea1-9d46-b02c79f9768f', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '0b41ed' },
  body: JSON.stringify({
    sessionId: '0b41ed',
    runId: 'post-fix',
    hypothesisId: 'A',
    location: 'frontend/src/app/config/env.ts:parse',
    message: 'vite public env snapshot before zod',
    data: {
      mode: import.meta.env.MODE,
      prod: import.meta.env.PROD,
      dev: import.meta.env.DEV,
      viteKeys: Object.keys(import.meta.env).filter((key) => key.startsWith('VITE_')),
      urlType: typeof publicEnv.VITE_SUPABASE_URL,
      anonType: typeof publicEnv.VITE_SUPABASE_ANON_KEY,
      apiType: typeof publicEnv.VITE_API_URL,
      urlDefined: Boolean(publicEnv.VITE_SUPABASE_URL),
      anonDefined: Boolean(publicEnv.VITE_SUPABASE_ANON_KEY),
      apiDefined: Boolean(publicEnv.VITE_API_URL),
    },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

const parsed = envSchema.safeParse(publicEnv);

export const missingPublicEnvKeys = parsed.success
  ? []
  : parsed.error.issues.map((issue) => String(issue.path[0] ?? 'unknown'));

// #region agent log
fetch('http://127.0.0.1:7774/ingest/f4cb5b74-6463-4ea1-9d46-b02c79f9768f', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '0b41ed' },
  body: JSON.stringify({
    sessionId: '0b41ed',
    runId: 'post-fix',
    hypothesisId: parsed.success ? 'D' : 'A',
    location: 'frontend/src/app/config/env.ts:safeParse',
    message: parsed.success ? 'zod parse succeeded' : 'zod parse failed without throw',
    data: {
      success: parsed.success,
      errorPaths: missingPublicEnvKeys,
    },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

const unconfiguredFallback: PublicEnv = {
  VITE_SUPABASE_URL: 'https://missing-env.invalid',
  VITE_SUPABASE_ANON_KEY: 'missing',
  VITE_API_URL: 'https://missing-env.invalid',
};

export const env: PublicEnv = parsed.data ?? unconfiguredFallback;
