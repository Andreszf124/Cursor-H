-- ============================================================
-- 008: notifications, notification_preferences
-- Idempotente. Ref: docs/DATABASE.md §3.9, RF-146–151
-- ============================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  type text not null
    check (type in (
      'class_reminder', 'checkin_reminder', 'activity_reminder',
      'review_reminder', 'assessment_reminder', 'system'
    )),
  title text not null,
  body text,
  payload jsonb,
  read_at timestamptz,
  scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notifications_student
  on public.notifications (student_id, created_at desc);
create index if not exists idx_notifications_unread
  on public.notifications (student_id) where read_at is null;
create index if not exists idx_notifications_scheduled
  on public.notifications (scheduled_for) where read_at is null;

drop trigger if exists notifications_set_updated_at on public.notifications;
create trigger notifications_set_updated_at
  before update on public.notifications
  for each row execute function public.set_updated_at();

alter table public.notifications enable row level security;

drop policy if exists owner_access on public.notifications;
create policy owner_access on public.notifications
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ---------- notification_preferences (RF-151) ----------
create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.profiles (id) on delete cascade,
  class_reminders boolean not null default true,
  checkin_reminders boolean not null default true,
  activity_reminders boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;

drop policy if exists owner_access on public.notification_preferences;
create policy owner_access on public.notification_preferences
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);
