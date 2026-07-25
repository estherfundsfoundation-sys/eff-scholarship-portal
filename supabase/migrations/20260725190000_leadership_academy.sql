create table if not exists public.academy_course_completions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id text not null,
  course_version integer not null check (course_version > 0),
  score integer not null check (score between 0 and 100),
  certificate_code text not null unique,
  completed_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

alter table public.academy_course_completions enable row level security;

create policy "academy_completion_owner_read"
on public.academy_course_completions
for select
to authenticated
using (user_id = auth.uid());

create index if not exists academy_course_completions_course_idx
on public.academy_course_completions(course_id, completed_at desc);
