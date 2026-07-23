create table if not exists public.career_profiles(
  user_id uuid primary key references public.profiles(id) on delete cascade,
  location text,
  applicant_type text,
  institution_or_employer text,
  degree_or_field text,
  graduation_year integer check(graduation_year is null or graduation_year between 1950 and 2100),
  linkedin_url text,
  work_url text,
  professional_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.career_profiles enable row level security;
create policy "career_profiles_owner" on public.career_profiles for all
using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,update,delete on public.career_profiles to authenticated;

alter table public.career_applications
  add column if not exists applicant_id uuid references public.profiles(id) on delete set null,
  add column if not exists posting_term text not null default 'Fall 2026',
  add column if not exists resume_filename text;

update public.career_applications ca
set applicant_id=p.id
from public.profiles p
where ca.applicant_id is null and lower(ca.email::text)=lower(p.primary_email::text);

create index if not exists career_applications_applicant_idx
on public.career_applications(applicant_id,created_at desc);

create unique index if not exists career_applications_one_active_term_idx
on public.career_applications(applicant_id,role_slug,posting_term)
where applicant_id is not null and status in('submitted','in_review','interview','selected');

create policy "career_applications_owner_read" on public.career_applications for select
using(applicant_id=auth.uid());
grant select on public.career_applications to authenticated;

create policy "career_application_history_owner_read" on public.career_application_history for select
using(exists(
  select 1 from public.career_applications ca
  where ca.id=application_id and ca.applicant_id=auth.uid()
));
grant select on public.career_application_history to authenticated;
