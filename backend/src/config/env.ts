import { z } from 'zod';

// Carga .env local si existe; en CI/producción las variables vienen del entorno.
try {
  process.loadEnvFile();
} catch {
  // Sin .env — continuar con process.env
}

/**
 * Validación de variables de entorno (SECURITY.md §14).
 * El servidor NO arranca si falta o es inválida alguna variable requerida.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  // SECRETO — solo backend, nunca exponer al cliente
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  AI_API_KEY: z.string().optional(),
  FRONTEND_URL: z.url(),
  /**
   * Solo desarrollo local: antivirus/proxy con MITM rompe el trust store de Node
   * (UNABLE_TO_VERIFY_LEAF_SIGNATURE). Nunca activar en producción.
   */
  ALLOW_INSECURE_TLS: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  /** Solo local: registro vía service role sin enviar email de confirmación. */
  DEV_AUTO_CONFIRM_REGISTER: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_TENANT_ID: z.string().optional(),
  MICROSOFT_REDIRECT_URI: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas o faltantes:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;

if (env.ALLOW_INSECURE_TLS) {
  if (env.NODE_ENV === 'production') {
    console.error('❌ ALLOW_INSECURE_TLS no está permitido en production');
    process.exit(1);
  }
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.warn(
    '⚠️  ALLOW_INSECURE_TLS=true: Node no verifica certificados TLS (solo local / antivirus MITM)',
  );
}
