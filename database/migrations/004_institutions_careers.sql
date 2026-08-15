-- ============================================================
-- 004: institutions, careers, student_careers, academic_periods,
--      subjects (base), student_subject_status
-- Idempotente. Ref: docs/DATABASE.md §3.2, RF-011–020
-- ============================================================

-- ---------- institutions (RF-011, RF-012) ----------
create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text,
  is_verified boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_institutions_name on public.institutions (name);

drop trigger if exists institutions_set_updated_at on public.institutions;
create trigger institutions_set_updated_at
  before update on public.institutions
  for each row
  execute function public.set_updated_at();

alter table public.institutions enable row level security;

-- Catálogo verificado: lectura pública autenticada; custom: solo el creador escribe
drop policy if exists institutions_select on public.institutions;
create policy institutions_select on public.institutions
  for select
  using (true);

drop policy if exists institutions_insert on public.institutions;
create policy institutions_insert on public.institutions
  for insert
  with check (created_by = auth.uid());

drop policy if exists institutions_update on public.institutions;
create policy institutions_update on public.institutions
  for update
  using (created_by = auth.uid() and is_verified = false)
  with check (created_by = auth.uid());

-- ---------- careers (RF-013, RF-014) ----------
create table if not exists public.careers (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  name text not null,
  degree_level text not null default 'licenciatura'
    check (degree_level in (
      'tecnico', 'diplomado', 'licenciatura', 'maestria', 'doctorado', 'otro'
    )),
  total_credits int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, name, degree_level)
);

drop trigger if exists careers_set_updated_at on public.careers;
create trigger careers_set_updated_at
  before update on public.careers
  for each row
  execute function public.set_updated_at();

alter table public.careers enable row level security;

drop policy if exists careers_select on public.careers;
create policy careers_select on public.careers
  for select
  using (true);

drop policy if exists careers_insert on public.careers;
create policy careers_insert on public.careers
  for insert
  with check (
    exists (
      select 1 from public.institutions i
      where i.id = institution_id
        and (i.is_verified = true or i.created_by = auth.uid())
    )
  );

-- ---------- student_careers ----------
create table if not exists public.student_careers (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  career_id uuid not null references public.careers (id) on delete restrict,
  is_active boolean not null default true,
  started_at date,
  expected_graduation date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, career_id)
);

create index if not exists idx_student_careers_active
  on public.student_careers (student_id) where is_active = true;

drop trigger if exists student_careers_set_updated_at on public.student_careers;
create trigger student_careers_set_updated_at
  before update on public.student_careers
  for each row
  execute function public.set_updated_at();

alter table public.student_careers enable row level security;

drop policy if exists owner_access on public.student_careers;
create policy owner_access on public.student_careers
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- academic_periods (RF-015, RF-016) ----------
create table if not exists public.academic_periods (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists idx_academic_periods_student
  on public.academic_periods (student_id, is_active);

drop trigger if exists academic_periods_set_updated_at on public.academic_periods;
create trigger academic_periods_set_updated_at
  before update on public.academic_periods
  for each row
  execute function public.set_updated_at();

alter table public.academic_periods enable row level security;

drop policy if exists owner_access on public.academic_periods;
create policy owner_access on public.academic_periods
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- Solo un período activo por estudiante
create or replace function public.ensure_single_active_period()
returns trigger
language plpgsql
as $$
begin
  if new.is_active = true then
    update public.academic_periods
    set is_active = false
    where student_id = new.student_id
      and id <> new.id
      and is_active = true;
  end if;
  return new;
end;
$$;

drop trigger if exists academic_periods_single_active on public.academic_periods;
create trigger academic_periods_single_active
  before insert or update of is_active on public.academic_periods
  for each row
  when (new.is_active = true)
  execute function public.ensure_single_active_period();

-- ---------- subjects (base para historial; Módulo 3 añade prerequisites/imports) ----------
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references public.careers (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  code text,
  name text not null,
  credits int not null default 0 check (credits >= 0),
  is_elective boolean not null default false,
  semester int,
  source text not null default 'manual' check (source in ('manual', 'pdf_import')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subjects_student on public.subjects (student_id, career_id);

drop trigger if exists subjects_set_updated_at on public.subjects;
create trigger subjects_set_updated_at
  before update on public.subjects
  for each row
  execute function public.set_updated_at();

alter table public.subjects enable row level security;

drop policy if exists owner_access on public.subjects;
create policy owner_access on public.subjects
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- student_subject_status (RF-017–019) ----------
create table if not exists public.student_subject_status (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('approved', 'failed', 'in_progress', 'pending')),
  grade text,
  completed_at date,
  academic_period_id uuid references public.academic_periods (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, subject_id)
);

drop trigger if exists student_subject_status_set_updated_at on public.student_subject_status;
create trigger student_subject_status_set_updated_at
  before update on public.student_subject_status
  for each row
  execute function public.set_updated_at();

alter table public.student_subject_status enable row level security;

drop policy if exists owner_access on public.student_subject_status;
create policy owner_access on public.student_subject_status
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);
