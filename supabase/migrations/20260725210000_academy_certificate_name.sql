alter table public.academy_course_completions
  add column if not exists certificate_name text;

alter table public.academy_course_completions
  drop constraint if exists academy_certificate_name_length;

alter table public.academy_course_completions
  add constraint academy_certificate_name_length
  check (
    certificate_name is null
    or (
      char_length(trim(certificate_name)) between 2 and 90
      and certificate_name !~ E'[\\n\\r\\t]'
    )
  );

comment on column public.academy_course_completions.certificate_name is
  'Learner-confirmed display name printed on the course-completion certificate.';
