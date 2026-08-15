-- ============================================================
-- 003: learning_preferences + trigger auto-perfil + bucket avatars
-- Idempotente. Ref: docs/DATABASE.md §3.1, docs/SECURITY.md §5
-- ============================================================

-- ---------- Tabla learning_preferences (RF-007) ----------
create table if not exists public.learning_preferences (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.profiles (id) on delete cascade,
  preferred_study_hours jsonb,
  learning_style text check (learning_style in ('visual', 'auditory', 'kinesthetic', 'mixed')),
  session_duration_minutes int not null default 45,
  difficulty_preference text not null default 'adaptive'
    check (difficulty_preference in ('adaptive', 'easy', 'challenging')),
  techniques text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists learning_preferences_set_updated_at on public.learning_preferences;
create trigger learning_preferences_set_updated_at
  before update on public.learning_preferences
  for each row
  execute function public.set_updated_at();

-- RLS: cada estudiante accede solo a sus preferencias (RF-010)
alter table public.learning_preferences enable row level security;

drop policy if exists owner_access on public.learning_preferences;
create policy owner_access on public.learning_preferences
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- Trigger: auto-crear perfil al registrarse (RF-001) ----------
-- Evita usar service role en el flujo de registro: el perfil se crea
-- automáticamente cuando Supabase Auth inserta el usuario.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------- Bucket avatars + políticas de Storage (RF-006) ----------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Solo el dueño escribe/borra en su prefijo {auth.uid()}/* (SECURITY.md §5.3)
drop policy if exists avatars_owner_insert on storage.objects;
create policy avatars_owner_insert on storage.objects
  for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_owner_update on storage.objects;
create policy avatars_owner_update on storage.objects
  for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_owner_delete on storage.objects;
create policy avatars_owner_delete on storage.objects
  for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
