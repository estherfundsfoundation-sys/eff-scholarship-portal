-- Safe, auditable automation for National Student Help Desk resource discovery.
-- This migration never changes eligibility, awards, application decisions, or school records.

create table if not exists public.student_support_resources(
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  title text not null,
  description text not null,
  url text not null,
  provider text not null,
  provider_kind text not null check(provider_kind in('federal','state','local_211','college','nonprofit','eff')),
  issue_types text[] not null default '{}',
  states text[] not null default '{}',
  keywords text[] not null default '{}',
  official_source boolean not null default false,
  verification_status text not null default 'pending' check(verification_status in('pending','verified','unavailable','quarantined')),
  last_http_status integer,
  last_verified_at timestamptz,
  next_check_at timestamptz not null default now(),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists student_support_resources_lookup_idx on public.student_support_resources(active,verification_status,next_check_at);
create index if not exists student_support_resources_issue_idx on public.student_support_resources using gin(issue_types);
create index if not exists student_support_resources_state_idx on public.student_support_resources using gin(states);
alter table public.student_support_resources enable row level security;
revoke all on public.student_support_resources from anon,authenticated;

create table if not exists public.student_support_discovery_runs(
  id uuid primary key default gen_random_uuid(),
  source_key text not null,
  status text not null check(status in('running','succeeded','partial','failed')),
  discovered_count integer not null default 0,
  verified_count integer not null default 0,
  quarantined_count integer not null default 0,
  safe_error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
alter table public.student_support_discovery_runs enable row level security;
revoke all on public.student_support_discovery_runs from anon,authenticated;

alter table public.student_help_case_resources
  add column if not exists support_resource_id uuid references public.student_support_resources(id) on delete set null,
  add column if not exists match_score integer check(match_score is null or match_score between 0 and 100),
  add column if not exists match_reason text,
  add column if not exists notification_status text not null default 'not_queued' check(notification_status in('not_queued','queued','sent','suppressed')),
  add column if not exists notified_at timestamptz;
create unique index if not exists student_help_case_resource_match_unique
  on public.student_help_case_resources(case_id,support_resource_id);

insert into public.student_support_resources(source_key,title,description,url,provider,provider_kind,issue_types,states,keywords,official_source,verification_status,next_check_at)
values
('fsa-help-center','Federal Student Aid Help Center','Official federal guidance for FAFSA, aid eligibility, account access, corrections, and financial-aid questions.','https://studentaid.gov/help-center','Federal Student Aid','federal',array['Financial aid or FAFSA','Past-due balance or registration hold'],array[]::text[],array['fafsa','financial aid','verification','student aid'],true,'verified',now()),
('hud-find-shelter','HUD Find Shelter','Official nationwide search for shelter, food pantries, health clinics, clothing, and homelessness resources.','https://www.hud.gov/findshelter','U.S. Department of Housing and Urban Development','federal',array['Housing or food insecurity'],array[]::text[],array['housing','shelter','food','rent','homeless'],true,'verified',now()),
('hud-state-resources','HUD State Information','Official state and local HUD contacts for rental assistance, housing counseling, public housing, and homelessness support.','https://www.hud.gov/states','U.S. Department of Housing and Urban Development','federal',array['Housing or food insecurity'],array[]::text[],array['rent','rental assistance','housing','state'],true,'verified',now()),
('211-national','211 Essential Services','Free, confidential connection to local food, housing, utilities, health, transportation, and crisis resources across most of the United States.','https://www.211.org/','211','local_211',array['Housing or food insecurity','Technology access','Other'],array[]::text[],array['food','housing','utilities','transportation','emergency','local'],true,'verified',now()),
('eff-scholarship-directory','EFF Scholarship Directory','Search current scholarships from their original providers and save opportunities in the EFF Portal.','https://portal.estherfundsfoundation.org/scholarships','Esther Funds Foundation','eff',array['Financial aid or FAFSA','Past-due balance or registration hold','Other'],array[]::text[],array['scholarship','tuition','balance','financial aid'],true,'verified',now()),
('eff-account-help','EFF Account Help','Guided support for EFF account, invitation, sign-in, password, and application-access problems.','https://portal.estherfundsfoundation.org/account-help','Esther Funds Foundation','eff',array['Technology access'],array[]::text[],array['login','password','account','access','application'],true,'verified',now())
on conflict(source_key) do update set
  title=excluded.title,description=excluded.description,url=excluded.url,issue_types=excluded.issue_types,
  keywords=excluded.keywords,official_source=excluded.official_source,active=true,updated_at=now();

comment on table public.student_support_resources is 'Verified official resources used by the National Help Desk matcher; candidate sources remain quarantined until validation.';
comment on column public.student_support_resources.official_source is 'True only for a provider-owned or EFF-owned canonical source.';
