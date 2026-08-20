create table if not exists public.student_match_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  academic_level text,
  graduation_year int check (graduation_year between 2020 and 2100),
  fields_of_study text[] not null default '{}',
  state_code text,
  country_code text not null default 'US',
  institution_name text,
  gpa_band text,
  enrollment_type text,
  citizenship_categories text[] not null default '{}',
  identity_tags text[] not null default '{}',
  affiliation_tags text[] not null default '{}',
  support_needs text[] not null default '{}',
  weekly_matches boolean not null default false,
  last_digest_queued_at timestamptz,
  quiz_completed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.external_scholarships
  add column if not exists verification_status text not null default 'needs_verification'
    check (verification_status in ('needs_verification','verified_current','needs_recheck','source_closed')),
  add column if not exists verified_at timestamptz,
  add column if not exists last_checked_at timestamptz,
  add column if not exists institution_unitid integer references public.college_directory(unitid) on delete set null,
  add column if not exists source_license text;

update public.external_scholarships scholarship
set verification_status='verified_current',
    verified_at=coalesce(scholarship.verified_at,observation.last_seen_at),
    last_checked_at=coalesce(scholarship.last_checked_at,observation.last_seen_at),
    source_license=source.permission_status
from public.source_observations observation
join public.external_sources source on source.id=observation.source_id
where observation.scholarship_id=scholarship.id
  and source.permission_status in ('written_permission','public_domain','open_license','official_provider');

-- General search engines remain useful discovery links, but their compiled catalogs are not
-- republished or counted unless a separate primary/provider source verifies the same record.
update public.external_scholarships scholarship
set verification_status='needs_verification', verified_at=null
where exists (
  select 1 from public.source_observations observation
  join public.external_sources source on source.id=observation.source_id
  where observation.scholarship_id=scholarship.id
    and source.key in ('fastweb','scholarships_com','bigfuture','scholarships360','bold','going_merry','niche','unigo','petersons','sallie_mae','careeronestop','chegg','appily','scholarshipowl','scholarship_america')
)
and not exists (
  select 1 from public.source_observations observation
  join public.external_sources source on source.id=observation.source_id
  where observation.scholarship_id=scholarship.id
    and source.key not in ('fastweb','scholarships_com','bigfuture','scholarships360','bold','going_merry','niche','unigo','petersons','sallie_mae','careeronestop','chegg','appily','scholarshipowl','scholarship_america')
    and source.permission_status in ('written_permission','public_domain','open_license','official_provider')
);

create index if not exists scholarship_verified_deadline_idx
on public.external_scholarships(verification_status,deadline,archived_at)
where published_at is not null;

create table if not exists public.student_resource_sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('institution','local','state','national','international')),
  institution_unit_id text,
  institution_name text,
  city text,
  county text,
  state_code text,
  country_code text not null default 'US',
  category text not null,
  title text not null,
  provider text,
  summary text,
  official_url text not null,
  contact jsonb not null default '{}',
  eligibility jsonb not null default '{}',
  availability_status text not null default 'needs_verification' check (availability_status in ('verified_open','seasonal','needs_verification','closed','historical_model')),
  verification_method text,
  last_verified_at timestamptz,
  next_review_at timestamptz,
  content_fingerprint text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(official_url, category)
);

create table if not exists public.resource_change_observations (
  id bigint generated always as identity primary key,
  resource_id uuid not null references public.student_resource_sources(id) on delete cascade,
  observed_at timestamptz not null default now(),
  http_status int,
  content_fingerprint text,
  changed boolean not null default false,
  safe_detail text
);

alter table public.student_match_profiles enable row level security;
alter table public.student_resource_sources enable row level security;
alter table public.resource_change_observations enable row level security;

create policy "match_profile_owner_read" on public.student_match_profiles for select to authenticated using (user_id=auth.uid());
create policy "match_profile_owner_insert" on public.student_match_profiles for insert to authenticated with check (user_id=auth.uid());
create policy "match_profile_owner_update" on public.student_match_profiles for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "match_profile_staff_read" on public.student_match_profiles for select to authenticated using (public.has_role('program_admin') or public.has_role('super_admin'));
create policy "verified_resources_public_read" on public.student_resource_sources for select using (archived_at is null and availability_status in ('verified_open','seasonal'));
create policy "resources_staff_all" on public.student_resource_sources for all to authenticated using (public.has_role('program_admin') or public.has_role('super_admin')) with check (public.has_role('program_admin') or public.has_role('super_admin'));
create policy "resource_observations_staff_read" on public.resource_change_observations for select to authenticated using (public.has_role('program_admin') or public.has_role('super_admin'));

create index if not exists resource_location_idx on public.student_resource_sources(country_code,state_code,county,city) where archived_at is null;
create index if not exists resource_category_idx on public.student_resource_sources(category,availability_status) where archived_at is null;
create index if not exists match_profile_digest_idx on public.student_match_profiles(weekly_matches,updated_at) where weekly_matches;

insert into public.email_templates(event_key,subject,body,version)
values(
  'weekly_scholarship_matches',
  'Your weekly EFF scholarship matches',
  '<p>Hello {{name}},</p><p>EFF found new scholarship opportunities that may fit the profile you created. A match is guidance, not a guarantee of eligibility or an award. Confirm every requirement on the provider website before applying.</p>{{matches_html}}<p><a href="{{matches_url}}">Review all of your matches</a> or update your quiz at any time.</p>',
  1
)
on conflict do nothing;

comment on table public.student_match_profiles is 'Private, student-controlled answers used only for explainable scholarship and resource matching.';
comment on table public.student_resource_sources is 'Verified institution, local, state, national, and international student-stability resources.';

insert into public.student_resource_sources
  (source_type,title,provider,category,country_code,summary,official_url,availability_status,verification_method,last_verified_at,next_review_at,content_fingerprint)
values
  ('national','Call 211 for local essentials','211','basic_needs','US','Find locally available food, housing, transportation, utility, and crisis-support services. Availability varies by community.','https://www.211.org/','verified_open','official_provider',now(),now()+interval '30 days','national|211|basic-needs'),
  ('national','988 Suicide & Crisis Lifeline','U.S. Department of Health and Human Services','mental_health','US','Call, text, or chat 988 for confidential crisis support in the United States. Call 911 for immediate danger.','https://988lifeline.org/','verified_open','government',now(),now()+interval '30 days','national|988|mental-health'),
  ('national','Federal Student Aid help','U.S. Department of Education','financial_aid','US','Official FAFSA, federal student-aid, repayment, and account guidance.','https://studentaid.gov/','verified_open','government',now(),now()+interval '30 days','national|studentaid|financial-aid'),
  ('national','Benefits.gov benefit finder','U.S. Government','public_benefits','US','Screen for government benefit programs. Results are guidance; the administering agency makes the eligibility decision.','https://www.benefits.gov/benefit-finder','verified_open','government',now(),now()+interval '30 days','national|benefits-gov|public-benefits'),
  ('national','HUD rental help by state','U.S. Department of Housing and Urban Development','housing','US','Official state-by-state rental assistance, tenant rights, and housing-counseling routes.','https://www.hud.gov/states','verified_open','government',now(),now()+interval '30 days','national|hud-states|housing')
on conflict (official_url,category) do update set
  summary=excluded.summary, verification_method=excluded.verification_method,
  last_verified_at=excluded.last_verified_at, next_review_at=excluded.next_review_at, archived_at=null;
