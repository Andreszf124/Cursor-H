-- ============================================================
-- 007: materials, content_chunks, embeddings + bucket materials
-- Idempotente. Ref: docs/DATABASE.md §3.4, RF-051–060, RF-101
-- ============================================================

-- ---------- materials (RF-051–059) ----------
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  title text not null,
  file_path text not null,
  mime_type text not null,
  category text not null default 'other'
    check (category in ('slides', 'notes', 'exam', 'book', 'video', 'link', 'other')),
  file_size bigint not null default 0 check (file_size >= 0),
  -- Salida de AIProvider.analyzeContent: { title, keywords, summary, ... } (RF-060)
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_materials_student
  on public.materials (student_id, created_at desc);
create index if not exists idx_materials_course on public.materials (course_id);
create index if not exists idx_materials_category on public.materials (student_id, category);
-- Búsqueda por título (RF-058)
create index if not exists idx_materials_title_search
  on public.materials using gin (to_tsvector('spanish', title));

drop trigger if exists materials_set_updated_at on public.materials;
create trigger materials_set_updated_at
  before update on public.materials
  for each row execute function public.set_updated_at();

alter table public.materials enable row level security;

drop policy if exists owner_access on public.materials;
create policy owner_access on public.materials
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- content_chunks (RF-101, base RAG) ----------
-- student_id redundante respecto a materials, pero obligatorio: el retrieval
-- filtra SIEMPRE por student_id y RLS lo verifica sin subconsultas.
create table if not exists public.content_chunks (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  chunk_index int not null check (chunk_index >= 0),
  content text not null,
  token_count int not null default 0 check (token_count >= 0),
  created_at timestamptz not null default now(),
  unique (material_id, chunk_index)
);

create index if not exists idx_content_chunks_student
  on public.content_chunks (student_id, material_id);

alter table public.content_chunks enable row level security;

drop policy if exists owner_access on public.content_chunks;
create policy owner_access on public.content_chunks
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- embeddings (RF-101) ----------
-- Dimensión 8: coincide con StubAIProvider.embed (backend/src/infrastructure/ai/provider.ts).
-- Al migrar a OpenAI text-embedding-3-small se crea una nueva migración con vector(1536).
create table if not exists public.embeddings (
  id uuid primary key default gen_random_uuid(),
  chunk_id uuid not null references public.content_chunks (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  embedding vector(8) not null,
  created_at timestamptz not null default now(),
  unique (chunk_id)
);

create index if not exists idx_embeddings_student on public.embeddings (student_id);
create index if not exists idx_embeddings_vector
  on public.embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 10);

alter table public.embeddings enable row level security;

drop policy if exists owner_access on public.embeddings;
create policy owner_access on public.embeddings
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- processing_jobs: tipos de job de materiales ----------
-- La tabla ya existe (005). Se añade progreso para jobs largos (transcripción, chunking).
alter table public.processing_jobs
  add column if not exists progress int not null default 0
  check (progress between 0 and 100);
alter table public.processing_jobs
  add column if not exists payload jsonb;

-- ---------- Bucket materials + políticas de Storage (RF-051) ----------
-- PRIVADO: material académico del estudiante, acceso por URL firmada.
insert into storage.buckets (id, name, public)
values ('materials', 'materials', false)
on conflict (id) do update set public = false;

drop policy if exists materials_owner_select on storage.objects;
create policy materials_owner_select on storage.objects
  for select
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists materials_owner_insert on storage.objects;
create policy materials_owner_insert on storage.objects
  for insert
  with check (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists materials_owner_update on storage.objects;
create policy materials_owner_update on storage.objects
  for update
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists materials_owner_delete on storage.objects;
create policy materials_owner_delete on storage.objects
  for delete
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
