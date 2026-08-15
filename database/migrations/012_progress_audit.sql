-- ============================================================
-- 012: audit_logs, storage_quotas + profiles.role / blocked_at
-- Idempotente. Ref: docs/DATABASE.md §3.10, RF-152–158
-- ============================================================

-- ---------- profiles: rol y bloqueo (RF-153, RF-155) ----------
alter table public.profiles
  add column if not exists role text not null default 'student'
  check (role in ('student', 'admin'));
alter table public.profiles
  add column if not exists blocked_at timestamptz;

-- ---------- audit_logs (RF-154) ----------
-- Append-only: el dueño LEE sus eventos; los INSERT los hace el backend con
-- service role (SECURITY.md R5) para que un cliente no pueda falsificar traza.
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  ip_address inet,
  user_agent text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_student
  on public.audit_logs (student_id, created_at desc);
create index if not exists idx_audit_logs_action
  on public.audit_logs (action, created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists owner_select on public.audit_logs;
create policy owner_select on public.audit_logs
  for select
  using (auth.uid() = student_id);

-- ---------- storage_quotas (RF-157) ----------
create table if not exists public.storage_quotas (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.profiles (id) on delete cascade,
  limit_bytes bigint not null default 524288000 check (limit_bytes >= 0),
  used_bytes bigint not null default 0 check (used_bytes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists storage_quotas_set_updated_at on public.storage_quotas;
create trigger storage_quotas_set_updated_at
  before update on public.storage_quotas
  for each row execute function public.set_updated_at();

alter table public.storage_quotas enable row level security;

-- El estudiante ve su cuota; solo el backend (service role) la modifica.
drop policy if exists owner_select on public.storage_quotas;
create policy owner_select on public.storage_quotas
  for select
  using (auth.uid() = student_id);
