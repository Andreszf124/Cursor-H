-- ============================================================
-- 009: checkins, checkin_topics, assessments,
--      assessment_questions, assessment_responses
-- Idempotente. Ref: docs/DATABASE.md §3.6, RF-081–090
-- ============================================================

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  schedule_id uuid references public.schedules (id) on delete set null,
  class_date date not null default current_date,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'skipped')),
  comprehension_level int check (comprehension_level between 1 and 5),
  difficulties text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_checkins_student
  on public.checkins (student_id, class_date desc);
create index if not exists idx_checkins_course on public.checkins (course_id);
create index if not exists idx_checkins_pending
  on public.checkins (student_id) where status = 'pending';

drop trigger if exists checkins_set_updated_at on public.checkins;
create trigger checkins_set_updated_at
  before update on public.checkins
  for each row execute function public.set_updated_at();

alter table public.checkins enable row level security;

drop policy if exists owner_access on public.checkins;
create policy owner_access on public.checkins
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- checkin_topics (RF-084–086) ----------
create table if not exists public.checkin_topics (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  topic text not null,
  -- 'student' = escrito por el estudiante; 'suggested' = propuesto por IA/material
  origin text not null default 'student' check (origin in ('student', 'suggested')),
  confirmed boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_checkin_topics_checkin
  on public.checkin_topics (checkin_id);
create index if not exists idx_checkin_topics_student
  on public.checkin_topics (student_id);

alter table public.checkin_topics enable row level security;

drop policy if exists owner_access on public.checkin_topics;
create policy owner_access on public.checkin_topics
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- assessments (RF-089, RF-090, RF-141) ----------
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  checkin_id uuid references public.checkins (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  type text not null default 'diagnostic'
    check (type in ('diagnostic', 'practice', 'review')),
  status text not null default 'pending'
    check (status in ('pending', 'completed')),
  score numeric(5, 2) check (score between 0 and 100),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assessments_student
  on public.assessments (student_id, created_at desc);
create index if not exists idx_assessments_checkin on public.assessments (checkin_id);

drop trigger if exists assessments_set_updated_at on public.assessments;
create trigger assessments_set_updated_at
  before update on public.assessments
  for each row execute function public.set_updated_at();

alter table public.assessments enable row level security;

drop policy if exists owner_access on public.assessments;
create policy owner_access on public.assessments
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- assessment_questions ----------
create table if not exists public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  position int not null default 0 check (position >= 0),
  question text not null,
  options jsonb,
  -- La respuesta esperada nunca se envía al cliente antes de responder.
  expected_answer text,
  topic text,
  created_at timestamptz not null default now()
);

create index if not exists idx_assessment_questions_assessment
  on public.assessment_questions (assessment_id, position);
create index if not exists idx_assessment_questions_student
  on public.assessment_questions (student_id);

alter table public.assessment_questions enable row level security;

drop policy if exists owner_access on public.assessment_questions;
create policy owner_access on public.assessment_questions
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- assessment_responses ----------
create table if not exists public.assessment_responses (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.assessment_questions (id) on delete cascade,
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  answer text not null,
  is_correct boolean not null default false,
  score numeric(4, 3) not null default 0 check (score between 0 and 1),
  feedback text,
  created_at timestamptz not null default now()
);

create index if not exists idx_assessment_responses_assessment
  on public.assessment_responses (assessment_id);
create index if not exists idx_assessment_responses_student
  on public.assessment_responses (student_id, created_at desc);

alter table public.assessment_responses enable row level security;

drop policy if exists owner_access on public.assessment_responses;
create policy owner_access on public.assessment_responses
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);
