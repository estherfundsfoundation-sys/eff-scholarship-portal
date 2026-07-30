-- Additive National Student Help Desk product separation.
-- Existing cases, volunteer profiles, conversations, messages, training attempts,
-- shifts, service logs, and escalations remain authoritative and are upgraded in place.

alter table public.student_help_cases
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists assigned_volunteer_id uuid references auth.users(id) on delete set null,
  add column if not exists assigned_staff_id uuid references auth.users(id) on delete set null,
  add column if not exists last_team_message_at timestamptz,
  add column if not exists outcome text,
  add column if not exists closed_at timestamptz;

create index if not exists student_help_cases_user_idx on public.student_help_cases(user_id,created_at desc);
create index if not exists student_help_cases_assignee_idx on public.student_help_cases(assigned_volunteer_id,status,updated_at desc);

create table if not exists public.help_desk_case_access_tokens(
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.student_help_cases(id) on delete cascade,
  token_hash text not null unique,
  requested_email citext not null,
  expires_at timestamptz not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists help_desk_case_access_case_idx on public.help_desk_case_access_tokens(case_id,expires_at desc);
alter table public.help_desk_case_access_tokens enable row level security;
revoke all on public.help_desk_case_access_tokens from anon,authenticated;

create table if not exists public.student_help_case_messages(
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.student_help_cases(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  author_type text not null check(author_type in('student','volunteer','staff','system')),
  author_name text not null,
  body text not null check(char_length(body) between 1 and 6000),
  internal_only boolean not null default false,
  source_message_id uuid unique,
  created_at timestamptz not null default now()
);
create index if not exists student_help_messages_case_idx on public.student_help_case_messages(case_id,created_at);
alter table public.student_help_case_messages enable row level security;
revoke all on public.student_help_case_messages from anon,authenticated;

insert into public.student_help_case_messages(case_id,author_user_id,author_type,author_name,body,internal_only,source_message_id,created_at)
select c.case_id,m.sender_user_id,
  case m.sender_type when 'admin' then 'staff' else m.sender_type end,
  case m.sender_type when 'student' then 'Student' when 'volunteer' then 'EFF Help Desk Volunteer' when 'admin' then 'EFF National Help Desk' else 'EFF National Help Desk' end,
  m.body,false,m.id,m.created_at
from public.help_desk_messages m
join public.help_desk_conversations c on c.id=m.conversation_id
on conflict(source_message_id) do nothing;

create table if not exists public.student_help_case_resources(
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.student_help_cases(id) on delete cascade,
  title text not null,
  description text,
  url text,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists student_help_resources_case_idx on public.student_help_case_resources(case_id,created_at);
alter table public.student_help_case_resources enable row level security;
revoke all on public.student_help_case_resources from anon,authenticated;

alter table public.help_desk_volunteer_profiles
  add column if not exists legal_name text,
  add column if not exists preferred_name text,
  add column if not exists email citext,
  add column if not exists time_zone text not null default 'America/New_York',
  add column if not exists age_confirmed boolean not null default false,
  add column if not exists personal_email_confirmed boolean not null default false,
  add column if not exists motivation text,
  add column if not exists experience text,
  add column if not exists availability_notes text,
  add column if not exists agreements_accepted boolean not null default false,
  add column if not exists onboarding_step text not null default 'application',
  add column if not exists training_completed_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists access_note text;

update public.help_desk_volunteer_profiles
set legal_name=coalesce(legal_name,display_name),
    preferred_name=coalesce(preferred_name,display_name),
    email=coalesce(email,notification_email),
    agreements_accepted=agreements_accepted or agreement_at is not null,
    training_completed_at=coalesce(training_completed_at,trained_at),
    onboarding_step=case when status='certified' then 'complete' when status='training' then 'training' else onboarding_step end;

alter table public.help_desk_volunteer_profiles drop constraint if exists help_desk_volunteer_profiles_status_check;
update public.help_desk_volunteer_profiles set status='active' where status='certified';
update public.help_desk_volunteer_profiles set status='suspended' where status='paused';
alter table public.help_desk_volunteer_profiles
  add constraint help_desk_volunteer_profiles_status_check
  check(status in('application_incomplete','training','awaiting_approval','active','recertification_required','suspended','revoked'));
alter table public.help_desk_volunteer_profiles alter column legal_name set not null;
alter table public.help_desk_volunteer_profiles alter column email set not null;
create unique index if not exists help_desk_volunteer_profiles_email_idx on public.help_desk_volunteer_profiles(lower(email::text));

create table if not exists public.help_desk_volunteer_training(
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references auth.users(id) on delete cascade,
  module_key text not null,
  completed boolean not null default false,
  score integer check(score is null or score between 0 and 100),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(volunteer_id,module_key)
);
alter table public.help_desk_volunteer_training enable row level security;
revoke all on public.help_desk_volunteer_training from anon,authenticated;

alter table public.help_desk_shifts
  add column if not exists starts_at timestamptz,
  add column if not exists notes text;
update public.help_desk_shifts set starts_at=coalesce(starts_at,started_at);
alter table public.help_desk_shifts alter column starts_at set not null;
alter table public.help_desk_shifts drop constraint if exists help_desk_shifts_status_check;
alter table public.help_desk_shifts add constraint help_desk_shifts_status_check
  check(status in('active','ended','expired','scheduled','checked_in','completed','missed','cancelled'));
create index if not exists help_desk_shifts_volunteer_time_idx on public.help_desk_shifts(volunteer_id,starts_at desc);

create table if not exists public.help_desk_service_hours(
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references auth.users(id) on delete cascade,
  shift_id uuid references public.help_desk_shifts(id) on delete set null,
  minutes integer not null check(minutes>0 and minutes<=1440),
  description text not null,
  status text not null default 'pending' check(status in('pending','verified','declined')),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  source_service_log_id uuid unique,
  created_at timestamptz not null default now()
);
create index if not exists help_desk_service_hours_volunteer_idx on public.help_desk_service_hours(volunteer_id,created_at desc);
alter table public.help_desk_service_hours enable row level security;
revoke all on public.help_desk_service_hours from anon,authenticated;

insert into public.help_desk_service_hours(volunteer_id,shift_id,minutes,description,status,verified_at,source_service_log_id,created_at)
select volunteer_id,shift_id,greatest(minutes_credited,1),coalesce(nullif(closeout_summary,''),'Verified National Help Desk conversation service.'),'verified',coalesce(ended_at,started_at),id,started_at
from public.help_desk_service_logs
where minutes_credited>0
on conflict(source_service_log_id) do nothing;

create table if not exists public.help_desk_staff_roles(
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check(role in('help_desk_agent','help_desk_supervisor','help_desk_quality','help_desk_safety','help_desk_admin')),
  active boolean not null default true,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key(user_id,role)
);
alter table public.help_desk_staff_roles enable row level security;
revoke all on public.help_desk_staff_roles from anon,authenticated;

create table if not exists public.help_desk_quality_reviews(
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.student_help_cases(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  score integer check(score is null or score between 0 and 100),
  findings text,
  status text not null default 'open' check(status in('open','coaching_required','resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table public.help_desk_quality_reviews enable row level security;
revoke all on public.help_desk_quality_reviews from anon,authenticated;

create table if not exists public.help_desk_safety_escalations(
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.student_help_cases(id) on delete cascade,
  severity text not null check(severity in('urgent','high','standard')),
  summary text not null,
  status text not null default 'open' check(status in('open','reviewing','resolved')),
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  source_escalation_id uuid unique,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists help_desk_safety_open_idx on public.help_desk_safety_escalations(status,created_at desc);
alter table public.help_desk_safety_escalations enable row level security;
revoke all on public.help_desk_safety_escalations from anon,authenticated;

insert into public.help_desk_safety_escalations(case_id,severity,summary,status,created_by,source_escalation_id,created_at,resolved_at)
select c.case_id,
  case e.severity when 'immediate' then 'urgent' when 'urgent' then 'urgent' else 'high' end,
  e.summary,
  case e.status when 'acknowledged' then 'reviewing' when 'resolved' then 'resolved' else 'open' end,
  e.created_by,e.id,e.created_at,e.resolved_at
from public.help_desk_escalations e
join public.help_desk_conversations c on c.id=e.conversation_id
where e.escalation_type='safety'
on conflict(source_escalation_id) do nothing;

create table if not exists public.help_desk_security_events(
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email_hash text,
  event_type text not null,
  product_context text not null default 'help-desk',
  metadata_safe jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists help_desk_security_events_time_idx on public.help_desk_security_events(created_at desc);
alter table public.help_desk_security_events enable row level security;
revoke all on public.help_desk_security_events from anon,authenticated;

update public.student_help_cases c
set assigned_volunteer_id=conversation.assigned_volunteer_id
from public.help_desk_conversations conversation
where conversation.case_id=c.id and c.assigned_volunteer_id is null;

insert into public.help_desk_staff_roles(user_id,role,active)
select id,'help_desk_admin',true from auth.users where lower(email)='nationals@estherfundsinc.org'
on conflict(user_id,role) do update set active=true,revoked_at=null;

comment on table public.help_desk_staff_roles is 'National Student Help Desk authorization only; scholarship roles do not imply access.';
comment on table public.help_desk_case_access_tokens is 'Short-lived hashed access tokens for verified Help Desk cases; no scholarship application access.';