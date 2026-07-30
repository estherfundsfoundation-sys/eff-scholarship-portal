alter table public.student_help_cases
  add column if not exists secure_access_issued_at timestamptz,
  add column if not exists last_student_message_at timestamptz,
  add column if not exists last_volunteer_message_at timestamptz;
create table if not exists public.help_desk_volunteer_profiles(
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  notification_email citext not null,
  status text not null default 'training'
    check(status in('training','certified','paused','revoked')),
  training_score integer not null default 0 check(training_score between 0 and 100),
  agreement_at timestamptz,
  trained_at timestamptz,
  certificate_number text unique,
  email_notifications boolean not null default true,
  last_notified_at timestamptz,
  last_active_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists help_desk_volunteers_status_idx
  on public.help_desk_volunteer_profiles(status,last_active_at desc);
alter table public.help_desk_volunteer_profiles enable row level security;
revoke all on public.help_desk_volunteer_profiles from anon,authenticated;
create table if not exists public.help_desk_training_attempts(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null check(score between 0 and 100),
  correct_answers integer not null,
  total_questions integer not null,
  passed boolean not null,
  answer_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists help_desk_training_attempts_user_idx
  on public.help_desk_training_attempts(user_id,created_at desc);
alter table public.help_desk_training_attempts enable row level security;
revoke all on public.help_desk_training_attempts from anon,authenticated;
create table if not exists public.help_desk_conversations(
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.student_help_cases(id) on delete cascade,
  access_token_hash text not null unique,
  status text not null default 'unassigned'
    check(status in('unassigned','assigned','active','waiting_student','escalated','safety_locked','closed')),
  assigned_volunteer_id uuid references auth.users(id) on delete set null,
  assigned_at timestamptz,
  risk_level text not null default 'routine'
    check(risk_level in('routine','priority','urgent','safety')),
  conduct_flag boolean not null default false,
  last_message_at timestamptz,
  closed_at timestamptz,
  closed_by uuid references auth.users(id) on delete set null,
  closed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists help_desk_conversations_queue_idx
  on public.help_desk_conversations(status,risk_level,last_message_at,created_at);
create index if not exists help_desk_conversations_volunteer_idx
  on public.help_desk_conversations(assigned_volunteer_id,status);
alter table public.help_desk_conversations enable row level security;
revoke all on public.help_desk_conversations from anon,authenticated;
create table if not exists public.help_desk_messages(
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.help_desk_conversations(id) on delete cascade,
  sender_type text not null check(sender_type in('student','volunteer','admin','system')),
  sender_user_id uuid references auth.users(id) on delete set null,
  body text not null check(char_length(body) between 1 and 6000),
  suggested_resource_keys text[] not null default '{}',
  safety_flag boolean not null default false,
  conduct_flag boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists help_desk_messages_conversation_idx
  on public.help_desk_messages(conversation_id,created_at);
alter table public.help_desk_messages enable row level security;
revoke all on public.help_desk_messages from anon,authenticated;
create table if not exists public.help_desk_shifts(
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references auth.users(id) on delete cascade,
  requested_minutes integer not null check(requested_minutes in(10,15,30,60)),
  status text not null default 'active' check(status in('active','ended','expired')),
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  ended_at timestamptz,
  conversations_claimed integer not null default 0
);
create index if not exists help_desk_shifts_active_idx
  on public.help_desk_shifts(volunteer_id,status,ends_at desc);
alter table public.help_desk_shifts enable row level security;
revoke all on public.help_desk_shifts from anon,authenticated;
create table if not exists public.help_desk_service_logs(
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.help_desk_conversations(id) on delete cascade,
  shift_id uuid references public.help_desk_shifts(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  minutes_credited integer not null default 0 check(minutes_credited between 0 and 240),
  volunteer_message_count integer not null default 0,
  closeout_summary text,
  receipt_emailed_at timestamptz
);
create index if not exists help_desk_service_logs_volunteer_idx
  on public.help_desk_service_logs(volunteer_id,started_at desc);
create unique index if not exists help_desk_service_logs_open_unique
  on public.help_desk_service_logs(volunteer_id,conversation_id) where ended_at is null;
alter table public.help_desk_service_logs enable row level security;
revoke all on public.help_desk_service_logs from anon,authenticated;
create table if not exists public.help_desk_escalations(
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.help_desk_conversations(id) on delete cascade,
  message_id uuid references public.help_desk_messages(id) on delete set null,
  escalation_type text not null
    check(escalation_type in('safety','conduct','privacy','legal_or_policy','funding_decision','media','volunteer_support','other')),
  severity text not null default 'priority' check(severity in('priority','urgent','immediate')),
  summary text not null,
  status text not null default 'open' check(status in('open','acknowledged','resolved')),
  created_by uuid references auth.users(id) on delete set null,
  email_alert_sent_at timestamptz,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists help_desk_escalations_open_idx
  on public.help_desk_escalations(status,severity,created_at desc);
alter table public.help_desk_escalations enable row level security;
revoke all on public.help_desk_escalations from anon,authenticated;
comment on table public.help_desk_volunteer_profiles is
  'Training-gated National Help Desk volunteers. Service-role access only.';
comment on table public.help_desk_conversations is
  'Private student-to-EFF conversations. Raw access tokens are never stored.';
comment on table public.help_desk_service_logs is
  'Auditable service-hour records based on actual conversation activity, not passive assignment time.';
