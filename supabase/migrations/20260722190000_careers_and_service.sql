create table if not exists public.career_applications(
  id uuid primary key default gen_random_uuid(),
  role_slug text not null,
  role_title text not null,
  category text not null,
  full_name text not null,
  preferred_name text,
  email citext not null,
  phone text not null,
  location text not null,
  applicant_type text not null,
  institution text not null,
  degree text not null,
  graduation_year integer,
  linkedin_url text,
  work_url text,
  resume_path text,
  weekly_availability text not null,
  available_start_date date not null,
  why_eff text not null,
  relevant_experience text not null,
  team_culture text not null,
  role_answers jsonb not null default '{}'::jsonb,
  is_volunteer boolean not null default false,
  applicant_signature text not null,
  ip_hash text,
  status text not null default 'submitted' check(status in('submitted','in_review','interview','selected','not_selected','withdrawn')),
  internal_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists career_applications_role_status_idx on public.career_applications(role_slug,status,created_at desc);
create index if not exists career_applications_email_idx on public.career_applications(email,created_at desc);
alter table public.career_applications enable row level security;

create table if not exists public.career_application_history(
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.career_applications(id) on delete cascade,
  previous_status text,
  new_status text not null,
  changed_by uuid references auth.users(id),
  note text,
  created_at timestamptz not null default now()
);
alter table public.career_application_history enable row level security;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('career-materials','career-materials',false,8388608,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

revoke all on public.career_applications from anon,authenticated;
revoke all on public.career_application_history from anon,authenticated;
