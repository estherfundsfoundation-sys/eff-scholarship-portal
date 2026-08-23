begin;

create type public.applyall_route_lifecycle as enum ('UNMAPPED','MAPPING','INTERNAL_QA','BUILD_APPROVED','SUBMISSION_REVIEW','SUBMIT_APPROVED','DEGRADED','PAUSED','RETIRED');
create type public.applyall_application_status as enum ('DRAFT','INTERVIEW_INCOMPLETE','READY_TO_BUILD','BUILD_QUEUED','BUILDING','ACTION_REQUIRED','BUILD_FAILED','BUILT','PREFLIGHT_FAILED','READY_FOR_REVIEW','READY_TO_AUTHORIZE','AUTHORIZED','SUBMISSION_QUEUED','SUBMITTING','SUBMITTED','PARTIALLY_SUBMITTED','SUBMISSION_FAILED','WITHDRAWN','CANCELED');
create type public.applyall_task_status as enum ('OPEN','IN_PROGRESS','WAITING_ON_OTHER','COMPLETED','WAIVED','EXPIRED','CANCELED');

create table public.applyall_profiles (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
  journey_stage text not null default 'SCHOOL_SELECTION', onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.applyall_regions (id uuid primary key default gen_random_uuid(), name text not null unique, active boolean not null default true);
create table public.applyall_states (code text primary key check (length(code)=2), name text not null unique);
create table public.applyall_region_states (region_id uuid references public.applyall_regions(id) on delete cascade, state_code text references public.applyall_states(code), primary key(region_id,state_code));
create table public.applyall_institutions (
  id uuid primary key default gen_random_uuid(), unitid bigint unique, name text not null, state_code text not null references public.applyall_states(code), city text,
  institution_type text not null, public_private text, level text, hbcu boolean not null default false, online_available boolean not null default false,
  website text, admissions_website text, application_url text, application_platform text, source_url text, source_verified_at timestamptz,
  is_demonstration boolean not null default false, active boolean not null default true, created_at timestamptz not null default now()
);
create table public.applyall_route_versions (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.applyall_institutions(id) on delete cascade,
  route_key text not null, version text not null, lifecycle public.applyall_route_lifecycle not null default 'UNMAPPED',
  allow_inspection boolean not null default false, allow_build boolean not null default false, allow_submit boolean not null default false,
  manifest jsonb not null default '{}'::jsonb, semantic_fingerprint text not null, approved_at timestamptz, approved_by uuid references auth.users(id),
  last_verified_at timestamptz, paused_reason text, created_at timestamptz not null default now(), unique(route_key,version)
);
create table public.applyall_canonical_concepts (
  id uuid primary key default gen_random_uuid(), canonical_key text not null unique, label text not null, data_type text not null,
  validation_schema jsonb not null default '{}'::jsonb, sensitivity_level text not null default 'STANDARD', student_only boolean not null default false,
  parent_allowed boolean not null default false, reusable boolean not null default true, explicit_confirmation boolean not null default false,
  legal_significance boolean not null default false, created_at timestamptz not null default now()
);
create table public.applyall_passport_answers (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.applyall_profiles(id) on delete cascade,
  concept_id uuid not null references public.applyall_canonical_concepts(id), value jsonb not null, source text not null default 'STUDENT_ENTERED',
  verification_state text not null default 'UNVERIFIED', student_approved_at timestamptz, expires_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(profile_id,concept_id)
);
create table public.applyall_school_selections (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.applyall_profiles(id) on delete cascade,
  institution_id uuid not null references public.applyall_institutions(id), applicant_type text not null default 'FIRST_YEAR', admission_term text not null,
  selected_at timestamptz not null default now(), unique(profile_id,institution_id,applicant_type,admission_term)
);
create table public.applyall_applications (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.applyall_profiles(id) on delete cascade,
  institution_id uuid not null references public.applyall_institutions(id), route_version_id uuid not null references public.applyall_route_versions(id),
  status public.applyall_application_status not null default 'DRAFT', applicant_type text not null, admission_term text not null,
  admission_plan text not null default 'REGULAR_DECISION', primary_major text, alternate_major text,
  current_snapshot_hash text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(profile_id,institution_id,applicant_type,admission_term)
);
create table public.applyall_application_snapshots (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applyall_applications(id) on delete cascade,
  snapshot_hash text not null unique, payload jsonb not null, immutable_at timestamptz not null default now()
);
create table public.applyall_tasks (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.applyall_profiles(id) on delete cascade,
  application_id uuid references public.applyall_applications(id) on delete cascade, owner text not null, title text not null, reason text not null,
  blocking boolean not null default false, status public.applyall_task_status not null default 'OPEN', due_at timestamptz, completed_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.applyall_submission_batches (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.applyall_profiles(id) on delete cascade,
  status text not null default 'DRAFT', authorized_at timestamptz, expires_at timestamptz, revoked_at timestamptz,
  approved_fee_limit numeric(10,2) not null default 0, consent_version text not null, ip_address inet, user_agent text,
  created_at timestamptz not null default now()
);
create table public.applyall_batch_items (
  batch_id uuid references public.applyall_submission_batches(id) on delete cascade,
  application_id uuid references public.applyall_applications(id) on delete cascade,
  snapshot_id uuid not null references public.applyall_application_snapshots(id), status text not null default 'QUEUED',
  idempotency_key text not null unique, primary key(batch_id,application_id)
);
create table public.applyall_receipts (
  id uuid primary key default gen_random_uuid(), application_id uuid not null unique references public.applyall_applications(id) on delete cascade,
  batch_id uuid not null references public.applyall_submission_batches(id), confirmation_number text not null,
  submitted_at timestamptz not null, route_version text not null, snapshot_hash text not null, receipt_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table public.applyall_supporter_permissions (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.applyall_profiles(id) on delete cascade,
  supporter_user_id uuid not null references auth.users(id) on delete cascade, permission_category text not null, granted_at timestamptz not null default now(),
  revoked_at timestamptz, unique(profile_id,supporter_user_id,permission_category)
);
create table public.applyall_route_events (
  id bigint generated always as identity primary key, route_version_id uuid not null references public.applyall_route_versions(id) on delete cascade,
  classification text not null, redacted_details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table public.applyall_audit_logs (
  id bigint generated always as identity primary key, actor_user_id uuid references auth.users(id), profile_id uuid references public.applyall_profiles(id) on delete set null,
  action text not null, entity_type text not null, entity_id text, redacted_metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table public.applyall_feature_flags (key text primary key, enabled boolean not null default false, updated_at timestamptz not null default now(), updated_by uuid references auth.users(id));

insert into public.applyall_feature_flags(key,enabled) values
('ENABLE_MOCK_APPLICATION_EXECUTION',true),('ENABLE_LIVE_ROUTE_INSPECTION',false),('ENABLE_LIVE_APPLICATION_BUILD',false),('ENABLE_LIVE_APPLICATION_SUBMISSION',false);
insert into public.applyall_states(code,name) values ('AL','Alabama'),('AR','Arkansas'),('FL','Florida'),('GA','Georgia'),('KY','Kentucky'),('LA','Louisiana'),('MS','Mississippi'),('NC','North Carolina'),('OK','Oklahoma'),('SC','South Carolina'),('TN','Tennessee'),('TX','Texas'),('VA','Virginia'),('WV','West Virginia');
with region as (insert into public.applyall_regions(name) values ('Southern Launch') returning id)
insert into public.applyall_region_states(region_id,state_code) select region.id,state.code from region cross join public.applyall_states state;

-- Reuse the portal's sourced NCES/IPEDS directory. Presence means discoverable,
-- not automation-ready. Every real route begins UNMAPPED with execution disabled.
insert into public.applyall_institutions(unitid,name,state_code,city,institution_type,public_private,level,hbcu,website,admissions_website,application_url,source_url,source_verified_at,is_demonstration,active)
select unitid,name,state,city,
  case when level_code=1 then 'FOUR_YEAR' when level_code=2 then 'TWO_YEAR' else 'OTHER' end,
  case when control_code=1 then 'PUBLIC' when control_code=2 then 'PRIVATE_NONPROFIT' when control_code=3 then 'PRIVATE_FOR_PROFIT' else 'UNKNOWN' end,
  case when level_code=1 then 'FOUR_YEAR' when level_code=2 then 'TWO_YEAR' else 'OTHER' end,
  hbcu,website,admissions_url,application_url,source_url,reviewed_at,false,active
from public.college_directory
where active=true and state in ('AL','AR','FL','GA','KY','LA','MS','NC','OK','SC','TN','TX','VA','WV')
on conflict(unitid) do update set name=excluded.name,city=excluded.city,website=excluded.website,admissions_website=excluded.admissions_website,application_url=excluded.application_url,source_url=excluded.source_url,source_verified_at=excluded.source_verified_at,active=excluded.active;

insert into public.applyall_route_versions(institution_id,route_key,version,lifecycle,allow_inspection,allow_build,allow_submit,manifest,semantic_fingerprint,last_verified_at)
select id,'ipeds.'||unitid::text,'unmapped','UNMAPPED',false,false,false,
  jsonb_build_object('application_url',application_url,'source_status','IPEDS-listed; route analysis required'),
  md5(coalesce(application_url,'')||':'||coalesce(source_verified_at::text,'')),source_verified_at
from public.applyall_institutions where is_demonstration=false
on conflict(route_key,version) do nothing;

alter table public.applyall_regions enable row level security;
alter table public.applyall_states enable row level security;
alter table public.applyall_region_states enable row level security;
alter table public.applyall_institutions enable row level security;
alter table public.applyall_route_versions enable row level security;
alter table public.applyall_canonical_concepts enable row level security;
alter table public.applyall_route_events enable row level security;
alter table public.applyall_audit_logs enable row level security;
alter table public.applyall_feature_flags enable row level security;
alter table public.applyall_profiles enable row level security;
alter table public.applyall_passport_answers enable row level security;
alter table public.applyall_school_selections enable row level security;
alter table public.applyall_applications enable row level security;
alter table public.applyall_application_snapshots enable row level security;
alter table public.applyall_tasks enable row level security;
alter table public.applyall_submission_batches enable row level security;
alter table public.applyall_batch_items enable row level security;
alter table public.applyall_receipts enable row level security;
alter table public.applyall_supporter_permissions enable row level security;

create policy "public reads applyall regions" on public.applyall_regions for select using (true);
create policy "public reads applyall states" on public.applyall_states for select using (true);
create policy "public reads applyall region states" on public.applyall_region_states for select using (true);
create policy "public reads active applyall institutions" on public.applyall_institutions for select using (active=true);
create policy "students own applyall profile" on public.applyall_profiles for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "students own passport answers" on public.applyall_passport_answers for all using (exists(select 1 from public.applyall_profiles p where p.id=profile_id and p.user_id=auth.uid())) with check (exists(select 1 from public.applyall_profiles p where p.id=profile_id and p.user_id=auth.uid()));
create policy "students own school selections" on public.applyall_school_selections for all using (exists(select 1 from public.applyall_profiles p where p.id=profile_id and p.user_id=auth.uid())) with check (exists(select 1 from public.applyall_profiles p where p.id=profile_id and p.user_id=auth.uid()));
create policy "students own applications" on public.applyall_applications for all using (exists(select 1 from public.applyall_profiles p where p.id=profile_id and p.user_id=auth.uid())) with check (exists(select 1 from public.applyall_profiles p where p.id=profile_id and p.user_id=auth.uid()));
create policy "students read own snapshots" on public.applyall_application_snapshots for select using (exists(select 1 from public.applyall_applications a join public.applyall_profiles p on p.id=a.profile_id where a.id=application_id and p.user_id=auth.uid()));
create policy "students own tasks" on public.applyall_tasks for all using (exists(select 1 from public.applyall_profiles p where p.id=profile_id and p.user_id=auth.uid())) with check (exists(select 1 from public.applyall_profiles p where p.id=profile_id and p.user_id=auth.uid()));
create policy "students own submission batches" on public.applyall_submission_batches for all using (exists(select 1 from public.applyall_profiles p where p.id=profile_id and p.user_id=auth.uid())) with check (exists(select 1 from public.applyall_profiles p where p.id=profile_id and p.user_id=auth.uid()));
create policy "students read own batch items" on public.applyall_batch_items for select using (exists(select 1 from public.applyall_submission_batches b join public.applyall_profiles p on p.id=b.profile_id where b.id=batch_id and p.user_id=auth.uid()));
create policy "students read own receipts" on public.applyall_receipts for select using (exists(select 1 from public.applyall_applications a join public.applyall_profiles p on p.id=a.profile_id where a.id=application_id and p.user_id=auth.uid()));
create policy "students manage supporter permissions" on public.applyall_supporter_permissions for all using (exists(select 1 from public.applyall_profiles p where p.id=profile_id and p.user_id=auth.uid())) with check (exists(select 1 from public.applyall_profiles p where p.id=profile_id and p.user_id=auth.uid()));

commit;
