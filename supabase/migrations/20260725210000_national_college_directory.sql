create table if not exists public.college_directory(
  unitid integer primary key,
  name text not null,
  aliases text,
  city text not null,
  state text not null,
  zip text,
  website text,
  admissions_url text,
  financial_aid_url text,
  application_url text,
  veterans_url text,
  accessibility_url text,
  sector_code integer,
  level_code integer,
  control_code integer,
  hbcu boolean not null default false,
  tribal boolean not null default false,
  institution_size_code integer,
  active boolean not null default true,
  latitude double precision,
  longitude double precision,
  source_name text not null default 'NCES IPEDS',
  source_year integer not null,
  source_url text not null,
  reviewed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists college_directory_name_idx on public.college_directory using gin(to_tsvector('english',name||' '||coalesce(aliases,'')));
create index if not exists college_directory_state_idx on public.college_directory(state,hbcu,name);
alter table public.college_directory enable row level security;
create policy "college_directory_public_read" on public.college_directory for select using(active);
grant select on public.college_directory to anon,authenticated;

create table if not exists public.college_contact_directory(
  id uuid primary key default gen_random_uuid(),
  unitid integer not null references public.college_directory(unitid) on delete cascade,
  department_key text not null check(department_key in('admissions','financial_aid','student_accounts','registrar','basic_needs','housing','accessibility','title_ix','veterans','international','student_advocacy','technology')),
  department_name text not null,
  contact_url text,
  email citext,
  phone text,
  source_url text not null,
  source_kind text not null check(source_kind in('IPEDS','official_school_page','staff_verified')),
  verification_status text not null default 'source_listed' check(verification_status in('source_listed','verified','needs_review','retired')),
  verified_at timestamptz,
  last_checked_at timestamptz not null default now(),
  next_review_at timestamptz not null default (now()+interval '180 days'),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(unitid,department_key)
);
create index if not exists college_contact_review_idx on public.college_contact_directory(verification_status,next_review_at);
alter table public.college_contact_directory enable row level security;
create policy "college_contacts_public_read" on public.college_contact_directory for select using(verification_status in('source_listed','verified'));
grant select on public.college_contact_directory to anon,authenticated;

comment on table public.college_directory is 'National postsecondary institution directory seeded from official NCES/IPEDS directory data.';
comment on table public.college_contact_directory is 'Department routing links and verified contact points; emails require official-source verification before EFF outreach.';
