-- ============================================================
-- 006: professors, courses, classrooms, schedules
-- Idempotente. Ref: docs/DATABASE.md §3.4, RF-031–041
-- ============================================================

-- ---------- professors (RF-034) ----------
create table if not exists public.professors (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_professors_student on public.professors (student_id, name);

drop trigger if exists professors_set_updated_at on public.professors;
create trigger professors_set_updated_at
  before update on public.professors
  for each row
  execute function public.set_updated_at();

alter table public.professors enable row level security;

drop policy if exists owner_access on public.professors;
create policy owner_access on public.professors
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- classrooms (RF-036) ----------
create table if not exists public.classrooms (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  location text,
  virtual_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_classrooms_student on public.classrooms (student_id, name);

drop trigger if exists classrooms_set_updated_at on public.classrooms;
create trigger classrooms_set_updated_at
  before update on public.classrooms
  for each row
  execute function public.set_updated_at();

alter table public.classrooms enable row level security;

drop policy if exists owner_access on public.classrooms;
create policy owner_access on public.classrooms
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- courses (RF-031–035) ----------
-- Un curso es la instancia de una materia en un período académico.
-- subject_id es nullable: se pueden registrar cursos antes de importar el plan.
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  academic_period_id uuid not null references public.academic_periods (id) on delete cascade,
  professor_id uuid references public.professors (id) on delete set null,
  name text not null,
  modality text not null default 'in_person'
    check (modality in ('in_person', 'virtual', 'hybrid')),
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_courses_student_period
  on public.courses (student_id, academic_period_id);
create index if not exists idx_courses_subject on public.courses (subject_id);

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at
  before update on public.courses
  for each row
  execute function public.set_updated_at();

alter table public.courses enable row level security;

drop policy if exists owner_access on public.courses;
create policy owner_access on public.courses
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- schedules (RF-037–041) ----------
-- day_of_week sigue la convención de JS Date.getDay(): 0 = domingo … 6 = sábado.
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  classroom_id uuid references public.classrooms (id) on delete set null,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  recurrence text not null default 'weekly'
    check (recurrence in ('weekly', 'biweekly', 'once')),
  valid_from date,
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  check (valid_until is null or valid_from is null or valid_until >= valid_from)
);

create index if not exists idx_schedules_student_day
  on public.schedules (student_id, day_of_week, start_time);
create index if not exists idx_schedules_course on public.schedules (course_id);

drop trigger if exists schedules_set_updated_at on public.schedules;
create trigger schedules_set_updated_at
  before update on public.schedules
  for each row
  execute function public.set_updated_at();

alter table public.schedules enable row level security;

drop policy if exists owner_access on public.schedules;
create policy owner_access on public.schedules
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);
