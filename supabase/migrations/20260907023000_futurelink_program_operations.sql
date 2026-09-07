-- FutureLink operational layer: onboarding, recurring Zoom plans, and auditable
-- National Office/manual matching support.
alter table public.futurelink_profiles
  add column if not exists orientation_completed_at timestamptz,
  add column if not exists readiness_acknowledged_at timestamptz;

create table if not exists public.futurelink_meeting_plans(
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.futurelink_matches(id) on delete cascade,
  cadence text not null check(cadence in('Weekly','Every other week','Monthly')),
  weekday text not null check(weekday in('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  local_time time not null,
  timezone text not null,
  zoom_url_private text,
  next_meeting_at timestamptz,
  notes_private text,
  updated_by uuid not null references public.futurelink_profiles(user_id),
  last_reminder_for timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.futurelink_meeting_plans enable row level security;
create policy "futurelink participants meeting plan read" on public.futurelink_meeting_plans
  for select to authenticated using(exists(
    select 1 from public.futurelink_matches m where m.id=match_id and auth.uid() in(m.mentee_id,m.mentor_id)
  ));
create policy "futurelink staff meeting plan manage" on public.futurelink_meeting_plans
  for all to authenticated using(public.has_role('program_admin') or public.has_role('super_admin'))
  with check(public.has_role('program_admin') or public.has_role('super_admin'));
grant select on public.futurelink_meeting_plans to authenticated;

create index if not exists futurelink_meeting_reminders_idx
  on public.futurelink_meeting_plans(next_meeting_at,last_reminder_for)
  where next_meeting_at is not null;
