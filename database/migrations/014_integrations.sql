-- ============================================================
-- 014: integrations (campus virtual, Microsoft Teams)
-- Idempotente. Ref: docs/DATABASE.md §3.12, RF-042–050, RF-073–080
-- ============================================================

-- REGLA CRÍTICA (RF-050, SECURITY.md §7): esta tabla NUNCA almacena
-- contraseñas del campus. Solo estado de conexión, identificador externo
-- y metadata no sensible. Los tokens OAuth de Teams viven en el proveedor
-- de identidad; aquí solo se guarda la referencia opaca.
create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null check (provider in ('campus', 'teams')),
  status text not null default 'disconnected'
    check (status in ('connected', 'disconnected', 'error')),
  external_account_id text,
  metadata jsonb,
  connected_at timestamptz,
  disconnected_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, provider)
);

create index if not exists idx_integrations_student
  on public.integrations (student_id, provider);

drop trigger if exists integrations_set_updated_at on public.integrations;
create trigger integrations_set_updated_at
  before update on public.integrations
  for each row execute function public.set_updated_at();

alter table public.integrations enable row level security;

drop policy if exists owner_access on public.integrations;
create policy owner_access on public.integrations
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- Guardarraíl defensivo: rechaza cualquier intento de guardar credenciales
-- en metadata, incluso por error de código (RF-050).
create or replace function public.integrations_reject_credentials()
returns trigger
language plpgsql
as $$
begin
  if new.metadata is not null and (
    new.metadata ? 'password'
    or new.metadata ? 'passwd'
    or new.metadata ? 'secret'
    or new.metadata ? 'access_token'
    or new.metadata ? 'refresh_token'
  ) then
    raise exception 'integrations.metadata no puede contener credenciales';
  end if;
  return new;
end;
$$;

drop trigger if exists integrations_no_credentials on public.integrations;
create trigger integrations_no_credentials
  before insert or update on public.integrations
  for each row execute function public.integrations_reject_credentials();
