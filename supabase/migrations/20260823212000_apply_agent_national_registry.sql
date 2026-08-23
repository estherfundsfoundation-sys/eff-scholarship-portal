begin;
create table if not exists public.apply_agent_institutions (
  id uuid primary key default gen_random_uuid(), unitid bigint unique, name text not null, state_code text not null, city text,
  website text, admissions_url text, application_url text, application_platform text,
  route_status text not null default 'UNVERIFIED' check(route_status in('UNVERIFIED','RESEARCHING','INTERNAL_QA','STUDENT_PILOT','VERIFIED','PAUSED','RETIRED')),
  last_verified_at timestamptz, verification_notes text, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
insert into public.apply_agent_institutions(unitid,name,state_code,city,website,admissions_url,application_url,active)
select unitid,name,state,city,website,admissions_url,application_url,active from public.college_directory where active=true
on conflict(unitid) do update set name=excluded.name,state_code=excluded.state_code,city=excluded.city,website=excluded.website,admissions_url=excluded.admissions_url,application_url=excluded.application_url,active=excluded.active,updated_at=now();
alter table public.apply_agent_institutions enable row level security;
create policy "public reads active apply agent institutions" on public.apply_agent_institutions for select using(active=true);
commit;
