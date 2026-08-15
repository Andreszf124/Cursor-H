-- ============================================================
-- 010: concepts, concept_mastery, mastery_evidence, knowledge_gaps
-- Idempotente. Ref: docs/DATABASE.md §3.7, RF-091–098
-- ============================================================

create table if not exists public.concepts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  course_id uuid references public.courses (id) on delete set null,
  name text not null,
  description text,
  -- 'checkin' | 'material' | 'transcript' | 'manual'
  source text not null default 'manual'
    check (source in ('checkin', 'material', 'transcript', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, name, course_id)
);

create index if not exists idx_concepts_student on public.concepts (student_id, name);
create index if not exists idx_concepts_subject on public.concepts (subject_id);

drop trigger if exists concepts_set_updated_at on public.concepts;
create trigger concepts_set_updated_at
  before update on public.concepts
  for each row execute function public.set_updated_at();

alter table public.concepts enable row level security;

drop policy if exists owner_access on public.concepts;
create policy owner_access on public.concepts
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- concept_mastery (RF-091, RF-092) ----------
create table if not exists public.concept_mastery (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  concept_id uuid not null references public.concepts (id) on delete cascade,
  mastery_percentage numeric(5, 2) not null default 0
    check (mastery_percentage between 0 and 100),
  evidence_count int not null default 0 check (evidence_count >= 0),
  last_evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, concept_id)
);

create index if not exists idx_concept_mastery_student
  on public.concept_mastery (student_id, mastery_percentage);

drop trigger if exists concept_mastery_set_updated_at on public.concept_mastery;
create trigger concept_mastery_set_updated_at
  before update on public.concept_mastery
  for each row execute function public.set_updated_at();

alter table public.concept_mastery enable row level security;

drop policy if exists owner_access on public.concept_mastery;
create policy owner_access on public.concept_mastery
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- mastery_evidence (RF-098) ----------
-- Histórico append-only: cada evaluación deja una fila para graficar evolución.
create table if not exists public.mastery_evidence (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  concept_id uuid not null references public.concepts (id) on delete cascade,
  source text not null default 'assessment'
    check (source in ('assessment', 'practice', 'checkin', 'manual')),
  source_id uuid,
  score numeric(4, 3) not null check (score between 0 and 1),
  mastery_after numeric(5, 2) check (mastery_after between 0 and 100),
  created_at timestamptz not null default now()
);

create index if not exists idx_mastery_evidence_student
  on public.mastery_evidence (student_id, created_at desc);
create index if not exists idx_mastery_evidence_concept
  on public.mastery_evidence (concept_id, created_at desc);

alter table public.mastery_evidence enable row level security;

drop policy if exists owner_access on public.mastery_evidence;
create policy owner_access on public.mastery_evidence
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- knowledge_gaps (RF-093–097) ----------
create table if not exists public.knowledge_gaps (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  concept_id uuid not null references public.concepts (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  severity text not null default 'medium'
    check (severity in ('critical', 'high', 'medium', 'low')),
  -- Score derivado (severidad + prerrequisito faltante + proximidad de evaluación)
  priority_score numeric(6, 2) not null default 0,
  prerequisite_missing boolean not null default false,
  next_assessment_date date,
  status text not null default 'active'
    check (status in ('active', 'improving', 'closed')),
  detected_from text not null default 'assessment'
    check (detected_from in ('assessment', 'checkin', 'practice', 'manual')),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, concept_id)
);

create index if not exists idx_knowledge_gaps_student_active
  on public.knowledge_gaps (student_id, priority_score desc) where status = 'active';
create index if not exists idx_knowledge_gaps_course on public.knowledge_gaps (course_id);

drop trigger if exists knowledge_gaps_set_updated_at on public.knowledge_gaps;
create trigger knowledge_gaps_set_updated_at
  before update on public.knowledge_gaps
  for each row execute function public.set_updated_at();

alter table public.knowledge_gaps enable row level security;

drop policy if exists owner_access on public.knowledge_gaps;
create policy owner_access on public.knowledge_gaps
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);
