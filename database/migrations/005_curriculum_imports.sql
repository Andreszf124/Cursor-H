-- ============================================================
-- 005: prerequisites, curriculum_imports, processing_jobs
--      + bucket privado curriculum
-- Idempotente. Ref: docs/DATABASE.md §3.3, RF-021–030
-- ============================================================

-- ---------- prerequisites (RF-026) ----------
-- student_id redundante respecto a subjects, pero necesario para que RLS
-- filtre por auth.uid() sin subconsultas en cada política.
create table if not exists public.prerequisites (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  prerequisite_subject_id uuid not null references public.subjects (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_id, prerequisite_subject_id),
  check (subject_id <> prerequisite_subject_id)
);

create index if not exists idx_prerequisites_subject on public.prerequisites (subject_id);
create index if not exists idx_prerequisites_student on public.prerequisites (student_id);

drop trigger if exists prerequisites_set_updated_at on public.prerequisites;
create trigger prerequisites_set_updated_at
  before update on public.prerequisites
  for each row
  execute function public.set_updated_at();

alter table public.prerequisites enable row level security;

drop policy if exists owner_access on public.prerequisites;
create policy owner_access on public.prerequisites
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- curriculum_imports (RF-021–025) ----------
create table if not exists public.curriculum_imports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  career_id uuid not null references public.careers (id) on delete cascade,
  file_path text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'review', 'completed', 'failed')),
  -- Salida de la extracción IA: { subjects: [...], prerequisites: [...] }
  extracted_data jsonb,
  -- Hallazgos que el estudiante debe revisar antes de confirmar (RF-024)
  inconsistencies jsonb,
  error_message text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_curriculum_imports_student
  on public.curriculum_imports (student_id, created_at desc);
create index if not exists idx_curriculum_imports_status
  on public.curriculum_imports (status);

drop trigger if exists curriculum_imports_set_updated_at on public.curriculum_imports;
create trigger curriculum_imports_set_updated_at
  before update on public.curriculum_imports
  for each row
  execute function public.set_updated_at();

alter table public.curriculum_imports enable row level security;

drop policy if exists owner_access on public.curriculum_imports;
create policy owner_access on public.curriculum_imports
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- processing_jobs (RF-023) ----------
-- Traza de trabajos asíncronos (extracción de PDF, análisis de contenido…).
create table if not exists public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  job_type text not null,
  entity_type text not null,
  entity_id uuid,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_processing_jobs_student
  on public.processing_jobs (student_id, created_at desc);
create index if not exists idx_processing_jobs_entity
  on public.processing_jobs (entity_type, entity_id);
create index if not exists idx_processing_jobs_pending
  on public.processing_jobs (status) where status in ('pending', 'processing');

drop trigger if exists processing_jobs_set_updated_at on public.processing_jobs;
create trigger processing_jobs_set_updated_at
  before update on public.processing_jobs
  for each row
  execute function public.set_updated_at();

alter table public.processing_jobs enable row level security;

drop policy if exists owner_access on public.processing_jobs;
create policy owner_access on public.processing_jobs
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- Bucket curriculum + políticas de Storage (RF-021) ----------
-- PRIVADO: los planes de estudio son documentos del estudiante.
-- El acceso se hace con URLs firmadas, nunca con URL pública.
insert into storage.buckets (id, name, public)
values ('curriculum', 'curriculum', false)
on conflict (id) do update set public = false;

-- Solo el dueño lee/escribe/borra en su prefijo {auth.uid()}/* (SECURITY.md §5.3)
drop policy if exists curriculum_owner_select on storage.objects;
create policy curriculum_owner_select on storage.objects
  for select
  using (bucket_id = 'curriculum' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists curriculum_owner_insert on storage.objects;
create policy curriculum_owner_insert on storage.objects
  for insert
  with check (bucket_id = 'curriculum' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists curriculum_owner_update on storage.objects;
create policy curriculum_owner_update on storage.objects
  for update
  using (bucket_id = 'curriculum' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'curriculum' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists curriculum_owner_delete on storage.objects;
create policy curriculum_owner_delete on storage.objects
  for delete
  using (bucket_id = 'curriculum' and (storage.foldername(name))[1] = auth.uid()::text);
