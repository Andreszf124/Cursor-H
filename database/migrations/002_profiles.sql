-- ============================================================
-- 002: Tabla profiles + RLS
-- Extiende auth.users con datos de aplicación.
-- Idempotente. Ref: docs/DATABASE.md §3.1, docs/SECURITY.md §5
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  language text not null default 'es',
  timezone text not null default 'America/Costa_Rica',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- RLS: cada usuario accede únicamente a su propio perfil (RF-010)
alter table public.profiles enable row level security;

drop policy if exists owner_access on public.profiles;
create policy owner_access on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);
