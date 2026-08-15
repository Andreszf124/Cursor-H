# Database — Migraciones Supabase

Migraciones SQL de Academic Ya!. Fuente de diseño: [docs/DATABASE.md](../docs/DATABASE.md).

## Convenciones

- Numeración secuencial: `001_`, `002_`, ...
- Toda migración es **idempotente** (`if not exists`, `drop ... if exists` antes de crear)
- Toda tabla con datos de estudiante habilita **RLS** en la misma migración que la crea
- Nunca cambiar una migración ya aplicada en remoto — crear una nueva

## Aplicar migraciones — Opción A: Supabase CLI (recomendada)

Requiere [Supabase CLI](https://supabase.com/docs/guides/cli) instalado y un proyecto creado en el dashboard.

```bash
# 1. Inicializar CLI en la raíz del repo (una sola vez; crea supabase/)
supabase init

# 2. Enlazar con el proyecto hosted (project-ref visible en la URL del dashboard)
supabase login
supabase link --project-ref <your-project-ref>

# 3. Copiar las migraciones al formato del CLI y aplicar
#    (el CLI usa supabase/migrations/<timestamp>_name.sql)
supabase migration new extensions      # luego pegar contenido de 001_extensions.sql
supabase migration new profiles        # luego pegar contenido de 002_profiles.sql
supabase db push
```

## Aplicar migraciones — Opción B: SQL Editor del dashboard

1. Abrir el proyecto en [supabase.com/dashboard](https://supabase.com/dashboard)
2. Ir a **SQL Editor**
3. Ejecutar en orden: `001_extensions.sql`, `002_profiles.sql`, `003_learning_preferences.sql`
4. Verificar en **Database > Tables** que `profiles`, `learning_preferences`, `institutions`, `careers`, `subjects`, `courses`, `schedules` (según migraciones aplicadas) existen con RLS habilitado
5. Aplicar migraciones en orden: `001` → `002` → `003` → `004_institutions_careers` → `005_curriculum_imports` → `006_courses_schedules` → y siguientes (`007+`) según la fase

## Verificación post-migración

```sql
-- Extensiones activas
select extname from pg_extension where extname in ('uuid-ossp', 'vector');

-- RLS habilitado
select relname, relrowsecurity from pg_class
where relname in ('profiles', 'learning_preferences');

-- Políticas activas
select tablename, policyname, cmd from pg_policies
where tablename in ('profiles', 'learning_preferences');

-- Trigger de auto-creación de perfil
select tgname from pg_trigger where tgname = 'on_auth_user_created';

-- Bucket avatars
select id, public from storage.buckets where id = 'avatars';
```

## Verificación manual de RLS (aislamiento entre estudiantes)

Los tests de CI usan mocks (no hay credenciales en CI). Verificar RLS contra la base real
después de aplicar migraciones — con dos usuarios de prueba A y B creados via registro:

```sql
-- Como usuario A (SQL Editor > Run as... o via API con JWT de A):
-- debe retornar SOLO la fila de A
select id from profiles;
select student_id from learning_preferences;
```

Desde la API: `GET /api/v1/profile` con el JWT de A nunca debe exponer datos de B.
El middleware toma `student_id` del JWT verificado; cualquier `student_id` en el body se ignora.

## Migraciones planificadas (Fase 1A+)

Ver [docs/DATABASE.md §7](../docs/DATABASE.md) — 003 a 013 se crean módulo a módulo según [docs/DEVELOPMENT_PLAN.md](../docs/DEVELOPMENT_PLAN.md).
