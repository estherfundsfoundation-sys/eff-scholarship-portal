create table if not exists public.howard_help_cases(
  id uuid primary key default gen_random_uuid(),
  case_code text not null unique,
  student_name text not null,
  preferred_name text,
  email citext not null unique,
  phone text,
  student_type text not null,
  issue_type text not null,
  enrollment_status text not null,
  balance_before numeric(12,2),
  balance_now numeric(12,2),
  school_deadline text,
  aid_summary text not null,
  timeline text not null,
  steps_taken text not null,
  authorize_eff_contact boolean not null default false,
  anonymous_advocacy_consent boolean not null default false,
  privacy_consent boolean not null default false,
  accuracy_certified boolean not null default false,
  verification_token_hash text unique,
  verification_expires_at timestamptz,
  verified_at timestamptz,
  advocacy_email_sent_at timestamptz,
  advocacy_provider_id text,
  status text not null default 'pending_verification' check(status in('pending_verification','sending','advocacy_sent','howard_review','reinstated','student_withdrew','closed_no_resolution','delivery_failed')),
  staff_note text,
  ip_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists howard_help_cases_status_idx on public.howard_help_cases(status,created_at desc);
create index if not exists howard_help_cases_verified_idx on public.howard_help_cases(verified_at desc);
alter table public.howard_help_cases enable row level security;
revoke all on public.howard_help_cases from anon,authenticated;

create table if not exists public.howard_petition_signatures(
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email citext not null unique,
  affiliation text not null,
  city_state text,
  display_anonymously boolean not null default false,
  verification_token_hash text unique,
  verification_expires_at timestamptz,
  verified_at timestamptz,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists howard_petition_verified_idx on public.howard_petition_signatures(verified_at desc);
alter table public.howard_petition_signatures enable row level security;
revoke all on public.howard_petition_signatures from anon,authenticated;

comment on table public.howard_help_cases is 'Consent-based Howard University reinstatement advocacy cases; service-role access only.';
comment on table public.howard_petition_signatures is 'Email-verified signatures supporting the EFF Howard reinstatement petition; service-role access only.';
