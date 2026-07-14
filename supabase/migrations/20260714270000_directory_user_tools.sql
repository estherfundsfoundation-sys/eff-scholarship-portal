create table if not exists public.notification_preferences(
  user_id uuid primary key references public.profiles on delete cascade,
  application_email boolean not null default true,
  scholarship_reminders boolean not null default false,
  administrative_notices boolean not null default true,
  updated_at timestamptz not null default now()
);
create table if not exists public.scholarship_reminders(
  user_id uuid not null references public.profiles on delete cascade,
  scholarship_id uuid not null references public.external_scholarships on delete cascade,
  remind_at timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  primary key(user_id,scholarship_id)
);
create table if not exists public.scholarship_reports(
  id uuid primary key default gen_random_uuid(),
  scholarship_id uuid not null references public.external_scholarships on delete cascade,
  reporter_id uuid not null references public.profiles on delete cascade,
  reason text not null check(reason in('broken_link','incorrect_information','expired','suspicious','other')),
  detail text,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles,
  created_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;
alter table public.scholarship_reminders enable row level security;
alter table public.scholarship_reports enable row level security;
create policy "preferences_owner" on public.notification_preferences for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "reminders_owner" on public.scholarship_reminders for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "reports_owner_insert" on public.scholarship_reports for insert to authenticated with check(reporter_id=auth.uid());
create policy "reports_owner_read" on public.scholarship_reports for select to authenticated using(reporter_id=auth.uid() or public.has_role('program_admin') or public.has_role('super_admin'));
create policy "reports_admin_update" on public.scholarship_reports for update to authenticated using(public.has_role('program_admin') or public.has_role('super_admin')) with check(public.has_role('program_admin') or public.has_role('super_admin'));
create policy "sources_admin_update" on public.external_sources for update to authenticated using(public.has_role('program_admin') or public.has_role('super_admin')) with check(public.has_role('program_admin') or public.has_role('super_admin'));
create index if not exists reminders_due_idx on public.scholarship_reminders(remind_at) where sent_at is null;
create index if not exists scholarship_reports_open_idx on public.scholarship_reports(created_at) where resolved_at is null;

create or replace function public.set_external_source_state(p_source_id uuid,p_active boolean,p_frequency_minutes int)
returns void language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid();
begin
  if actor is null or not (public.has_role('program_admin') or public.has_role('super_admin')) then raise exception 'Not authorized.'; end if;
  if p_frequency_minutes<360 or p_frequency_minutes>10080 then raise exception 'Frequency must be between 6 hours and 7 days.'; end if;
  update public.external_sources set active=p_active,frequency_minutes=p_frequency_minutes,health=case when p_active and health='paused' then 'degraded'::public.source_health when not p_active then 'paused'::public.source_health else health end where id=p_source_id;
  insert into public.audit_events(actor_id,action,target_type,target_id,metadata_safe) values(actor,'external_source_configured','external_source',p_source_id::text,jsonb_build_object('active',p_active,'frequency_minutes',p_frequency_minutes));
end $$;
revoke all on function public.set_external_source_state(uuid,boolean,int) from public;
grant execute on function public.set_external_source_state(uuid,boolean,int) to authenticated;
