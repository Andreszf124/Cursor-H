-- 010 knowledge gaps RF-089–098
create table if not exists public.concepts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  subject_id uuid references public.subjects (id) on delete set null,
  name text not null,
  created_at timestamptz not null default now()
);
alter table public.concepts enable row level security;
drop policy if exists owner_access on public.concepts;
create policy owner_access on public.concepts for all using (auth.uid() = student_id) with check (auth.uid() = student_id);

create table if not exists public.concept_mastery (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  concept_id uuid not null references public.concepts (id) on delete cascade,
  mastery_percent numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (student_id, concept_id)
);
alter table public.concept_mastery enable row level security;
drop policy if exists owner_access on public.concept_mastery;
create policy owner_access on public.concept_mastery for all using (auth.uid() = student_id) with check (auth.uid() = student_id);

create table if not exists public.knowledge_gaps (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  concept_id uuid references public.concepts (id) on delete set null,
  course_id uuid references public.courses (id) on delete set null,
  priority text not null check (priority in ('critical', 'high', 'medium', 'low')),
  reason text,
  status text not null default 'open' check (status in ('open', 'addressed', 'closed')),
  created_at timestamptz not null default now()
);
alter table public.knowledge_gaps enable row level security;
drop policy if exists owner_access on public.knowledge_gaps;
create policy owner_access on public.knowledge_gaps for all using (auth.uid() = student_id) with check (auth.uid() = student_id);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  checkin_id uuid references public.checkins (id) on delete set null,
  course_id uuid references public.courses (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.assessments enable row level security;
drop policy if exists owner_access on public.assessments;
create policy owner_access on public.assessments for all using (auth.uid() = student_id) with check (auth.uid() = student_id);

create table if not exists public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  question text not null,
  expected_answer text,
  options jsonb
);
alter table public.assessment_questions enable row level security;
drop policy if exists owner_access on public.assessment_questions;
create policy owner_access on public.assessment_questions for all using (auth.uid() = student_id) with check (auth.uid() = student_id);

create table if not exists public.assessment_responses (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.assessment_questions (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  answer text not null,
  score numeric,
  feedback text,
  created_at timestamptz not null default now()
);
alter table public.assessment_responses enable row level security;
drop policy if exists owner_access on public.assessment_responses;
create policy owner_access on public.assessment_responses for all using (auth.uid() = student_id) with check (auth.uid() = student_id);
