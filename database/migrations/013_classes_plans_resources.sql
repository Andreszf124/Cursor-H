-- ============================================================
-- 013: transcripts, transcript_segments, learning_plans,
--      learning_activities, educational_resources, saved_resources
-- Idempotente. Ref: docs/DATABASE.md §3.5/§3.11, RF-061–072, RF-107–115, RF-125–130
-- ============================================================

-- ---------- transcripts (RF-063, RF-076) ----------
create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  material_id uuid references public.materials (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  source text not null default 'upload'
    check (source in ('upload', 'teams', 'manual')),
  language text not null default 'es',
  full_text text,
  duration_seconds int check (duration_seconds >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  summary text,
  topics jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_transcripts_student
  on public.transcripts (student_id, created_at desc);
create index if not exists idx_transcripts_material on public.transcripts (material_id);

drop trigger if exists transcripts_set_updated_at on public.transcripts;
create trigger transcripts_set_updated_at
  before update on public.transcripts
  for each row execute function public.set_updated_at();

alter table public.transcripts enable row level security;

drop policy if exists owner_access on public.transcripts;
create policy owner_access on public.transcripts
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- transcript_segments (RF-068, RF-070) ----------
create table if not exists public.transcript_segments (
  id uuid primary key default gen_random_uuid(),
  transcript_id uuid not null references public.transcripts (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  segment_index int not null check (segment_index >= 0),
  start_seconds numeric(10, 3) not null default 0 check (start_seconds >= 0),
  end_seconds numeric(10, 3),
  content text not null,
  created_at timestamptz not null default now(),
  unique (transcript_id, segment_index)
);

create index if not exists idx_transcript_segments_transcript
  on public.transcript_segments (transcript_id, segment_index);
create index if not exists idx_transcript_segments_student
  on public.transcript_segments (student_id);
create index if not exists idx_transcript_segments_search
  on public.transcript_segments using gin (to_tsvector('spanish', content));

alter table public.transcript_segments enable row level security;

drop policy if exists owner_access on public.transcript_segments;
create policy owner_access on public.transcript_segments
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- learning_plans (RF-107–110, RF-115) ----------
create table if not exists public.learning_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  title text not null default 'Plan de estudio',
  available_minutes int not null default 60 check (available_minutes > 0),
  next_class_at timestamptz,
  status text not null default 'active'
    check (status in ('active', 'completed', 'archived')),
  generated_from jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_learning_plans_student_active
  on public.learning_plans (student_id, created_at desc) where status = 'active';

drop trigger if exists learning_plans_set_updated_at on public.learning_plans;
create trigger learning_plans_set_updated_at
  before update on public.learning_plans
  for each row execute function public.set_updated_at();

alter table public.learning_plans enable row level security;

drop policy if exists owner_access on public.learning_plans;
create policy owner_access on public.learning_plans
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- learning_activities (RF-111–114) ----------
create table if not exists public.learning_activities (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.learning_plans (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  concept_id uuid references public.concepts (id) on delete set null,
  position int not null default 0 check (position >= 0),
  title text not null,
  description text,
  technique text not null default 'active_recall'
    check (technique in (
      'active_recall', 'spaced_repetition', 'feynman', 'practice', 'reading', 'video'
    )),
  estimated_minutes int not null default 15 check (estimated_minutes > 0),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'skipped')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_learning_activities_plan
  on public.learning_activities (plan_id, position);
create index if not exists idx_learning_activities_student
  on public.learning_activities (student_id, status);

drop trigger if exists learning_activities_set_updated_at on public.learning_activities;
create trigger learning_activities_set_updated_at
  before update on public.learning_activities
  for each row execute function public.set_updated_at();

alter table public.learning_activities enable row level security;

drop policy if exists owner_access on public.learning_activities;
create policy owner_access on public.learning_activities
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- educational_resources (RF-125–129) ----------
-- Catálogo compartido: lectura para cualquier autenticado, escritura del backend.
create table if not exists public.educational_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  source_type text not null default 'article'
    check (source_type in ('video', 'article', 'course', 'book', 'exercise', 'other')),
  origin text,
  language text not null default 'es',
  reliability_score numeric(4, 2) not null default 0.5
    check (reliability_score between 0 and 1),
  recommendation_reason text,
  topics jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (url)
);

create index if not exists idx_educational_resources_search
  on public.educational_resources using gin (to_tsvector('spanish', title));
create index if not exists idx_educational_resources_reliability
  on public.educational_resources (reliability_score desc);

drop trigger if exists educational_resources_set_updated_at on public.educational_resources;
create trigger educational_resources_set_updated_at
  before update on public.educational_resources
  for each row execute function public.set_updated_at();

alter table public.educational_resources enable row level security;

drop policy if exists educational_resources_select on public.educational_resources;
create policy educational_resources_select on public.educational_resources
  for select
  using (true);

-- ---------- saved_resources (RF-130) ----------
create table if not exists public.saved_resources (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  resource_id uuid not null references public.educational_resources (id) on delete cascade,
  concept_id uuid references public.concepts (id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  unique (student_id, resource_id)
);

create index if not exists idx_saved_resources_student
  on public.saved_resources (student_id, created_at desc);

alter table public.saved_resources enable row level security;

drop policy if exists owner_access on public.saved_resources;
create policy owner_access on public.saved_resources
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);
