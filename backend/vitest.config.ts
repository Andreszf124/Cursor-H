import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Valores dummy para que la validación Zod de env pase en tests.
    // No son credenciales reales.
    env: {
      NODE_ENV: 'test',
      PORT: '3000',
      SUPABASE_URL: 'https://test-project.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      FRONTEND_URL: 'http://localhost:5173',
    },
  },
});
