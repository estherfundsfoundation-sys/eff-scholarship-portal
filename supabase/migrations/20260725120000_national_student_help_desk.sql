create table if not exists public.student_help_cases(
  id uuid primary key default gen_random_uuid(),
  case_code text not null unique,
  student_name text not null,
  preferred_name text,
  email citext not null,
  phone text,
  school_name text not null,
  school_state text not null,
  school_type text not null check(school_type in('HBCU','PWI or other institution','Unsure')),
  student_level text not null,
  issue_type text not null,
  urgency text not null,
  school_deadline date,
  amount_at_risk numeric(12,2),
  situation_summary text not null,
  steps_taken text not null,
  documents_available text[] not null default '{}',
  department_sought text,
  essentials_requested boolean not null default false,
  essentials_term text check(essentials_term is null or essentials_term in('Fall','Spring')),
  essentials_category text,
  essentials_amount numeric(6,2) check(essentials_amount is null or (essentials_amount > 0 and essentials_amount <= 100)),
  essentials_explanation text,
  preferred_payment_method text,
  payment_details_requested_at timestamptz,
  payment_details_received_at timestamptz,
  essentials_status text not null default 'not_requested' check(essentials_status in('not_requested','requested','under_review','approved','payment_pending','paid','declined','waitlisted')),
  essentials_paid_amount numeric(6,2) check(essentials_paid_amount is null or (essentials_paid_amount >= 0 and essentials_paid_amount <= 100)),
  essentials_payment_reference text,
  authorize_eff_contact boolean not null default false,
  privacy_consent boolean not null default false,
  accuracy_certified boolean not null default false,
  verification_token_hash text unique,
  verification_expires_at timestamptz,
  verified_at timestamptz,
  status text not null default 'pending_verification' check(status in('pending_verification','new','reviewing','waiting_on_student','referred_to_school','follow_up_due','resolved','closed','delivery_failed')),
  next_follow_up_at timestamptz,
  last_follow_up_at timestamptz,
  follow_up_count integer not null default 0,
  staff_note text,
  ip_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_help_cases_status_idx on public.student_help_cases(status,created_at desc);
create index if not exists student_help_cases_follow_up_idx on public.student_help_cases(next_follow_up_at) where status not in('resolved','closed');
create index if not exists student_help_cases_school_idx on public.student_help_cases(lower(school_name),school_state);
alter table public.student_help_cases enable row level security;
revoke all on public.student_help_cases from anon,authenticated;

create table if not exists public.student_help_case_events(
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.student_help_cases(id) on delete cascade,
  event_type text not null,
  summary text not null,
  created_at timestamptz not null default now()
);
create index if not exists student_help_case_events_case_idx on public.student_help_case_events(case_id,created_at desc);
alter table public.student_help_case_events enable row level security;
revoke all on public.student_help_case_events from anon,authenticated;

comment on table public.student_help_cases is 'National, consent-based student support cases and optional Fall Essentials requests; service-role access only.';
comment on column public.student_help_cases.preferred_payment_method is 'Student preference only. EFF selects and verifies the final disbursement method after approval; never display publicly.';
