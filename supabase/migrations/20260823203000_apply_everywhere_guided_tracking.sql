begin;
create table if not exists public.applyall_guided_applications (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.applyall_profiles(id) on delete cascade,
  institution_id uuid not null references public.applyall_institutions(id) on delete cascade,
  applicant_type text not null default 'FIRST_YEAR', admission_term text not null default 'Fall 2027',
  status text not null default 'NOT_STARTED' check (status in ('NOT_STARTED','IN_PROGRESS','ACTION_REQUIRED','SUBMITTED','COMPLETE')),
  school_specific_notes text, confirmation_number text, submitted_at timestamptz, last_opened_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(profile_id,institution_id,applicant_type,admission_term),
  check (status <> 'SUBMITTED' or (confirmation_number is not null and length(trim(confirmation_number)) >= 3))
);
alter table public.applyall_guided_applications enable row level security;
create policy "students manage own guided applications" on public.applyall_guided_applications for all
using (exists(select 1 from public.applyall_profiles p where p.id=profile_id and p.user_id=auth.uid()))
with check (exists(select 1 from public.applyall_profiles p where p.id=profile_id and p.user_id=auth.uid()));
commit;
