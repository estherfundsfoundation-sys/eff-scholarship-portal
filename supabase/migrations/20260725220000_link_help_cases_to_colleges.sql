alter table public.student_help_cases
  add column if not exists college_unitid integer references public.college_directory(unitid) on delete set null;

create index if not exists student_help_cases_college_idx
on public.student_help_cases(college_unitid,created_at desc);

comment on column public.student_help_cases.college_unitid is 'Official NCES/IPEDS institution identifier selected by the student; null only when a school cannot be found in the national directory.';
