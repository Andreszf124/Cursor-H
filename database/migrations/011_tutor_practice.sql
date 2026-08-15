-- ============================================================
-- 011: tutor_conversations, tutor_messages,
--      practices, exercises, exercise_attempts
-- Idempotente. Ref: docs/DATABASE.md §3.8, RF-099–106, RF-116–124
-- ============================================================

create table if not exists public.tutor_conversations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  concept_id uuid references public.concepts (id) on delete set null,
  title text not null default 'Nueva conversación',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tutor_conversations_student
  on public.tutor_conversations (student_id, updated_at desc);

drop trigger if exists tutor_conversations_set_updated_at on public.tutor_conversations;
create trigger tutor_conversations_set_updated_at
  before update on public.tutor_conversations
  for each row execute function public.set_updated_at();

alter table public.tutor_conversations enable row level security;

drop policy if exists owner_access on public.tutor_conversations;
create policy owner_access on public.tutor_conversations
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- tutor_messages (RF-100, RF-101) ----------
create table if not exists public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.tutor_conversations (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  -- Chunks citados por el RAG: [{ chunk_id, material_id, title }] (RF-101)
  sources jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_tutor_messages_conversation
  on public.tutor_messages (conversation_id, created_at);
create index if not exists idx_tutor_messages_student
  on public.tutor_messages (student_id, created_at desc);

alter table public.tutor_messages enable row level security;

drop policy if exists owner_access on public.tutor_messages;
create policy owner_access on public.tutor_messages
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- practices (RF-116, RF-124) ----------
create table if not exists public.practices (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  concept_id uuid references public.concepts (id) on delete set null,
  gap_id uuid references public.knowledge_gaps (id) on delete set null,
  title text not null,
  difficulty text not null default 'medium'
    check (difficulty in ('easy', 'medium', 'hard')),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed')),
  score numeric(5, 2) check (score between 0 and 100),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_practices_student
  on public.practices (student_id, created_at desc);
create index if not exists idx_practices_gap on public.practices (gap_id);

drop trigger if exists practices_set_updated_at on public.practices;
create trigger practices_set_updated_at
  before update on public.practices
  for each row execute function public.set_updated_at();

alter table public.practices enable row level security;

drop policy if exists owner_access on public.practices;
create policy owner_access on public.practices
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- exercises (RF-121, RF-123) ----------
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  position int not null default 0 check (position >= 0),
  statement text not null,
  options jsonb,
  correct_answer text,
  solution text,
  difficulty text not null default 'medium'
    check (difficulty in ('easy', 'medium', 'hard')),
  -- Hash del enunciado normalizado: evita regenerar el mismo ejercicio (RF-123)
  content_hash text not null,
  created_at timestamptz not null default now(),
  unique (student_id, content_hash)
);

create index if not exists idx_exercises_practice
  on public.exercises (practice_id, position);

alter table public.exercises enable row level security;

drop policy if exists owner_access on public.exercises;
create policy owner_access on public.exercises
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- exercise_attempts (RF-122) ----------
create table if not exists public.exercise_attempts (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  practice_id uuid not null references public.practices (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  answer text not null,
  is_correct boolean not null default false,
  score numeric(4, 3) not null default 0 check (score between 0 and 1),
  feedback text,
  time_spent_seconds int not null default 0 check (time_spent_seconds >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_exercise_attempts_student
  on public.exercise_attempts (student_id, created_at desc);
create index if not exists idx_exercise_attempts_practice
  on public.exercise_attempts (practice_id);

alter table public.exercise_attempts enable row level security;

drop policy if exists owner_access on public.exercise_attempts;
create policy owner_access on public.exercise_attempts
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);
