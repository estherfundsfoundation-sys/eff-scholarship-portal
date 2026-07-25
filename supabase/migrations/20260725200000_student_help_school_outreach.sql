alter table public.student_help_cases
  add column if not exists recommended_department text,
  add column if not exists department_email citext,
  add column if not exists department_email_source text,
  add column if not exists department_email_verified_at timestamptz,
  add column if not exists outreach_subject text,
  add column if not exists outreach_body text,
  add column if not exists outreach_approved_by uuid references auth.users(id) on delete set null,
  add column if not exists outreach_sent_at timestamptz,
  add column if not exists outreach_provider_id text,
  add column if not exists school_follow_up_count integer not null default 0,
  add column if not exists next_school_follow_up_at timestamptz,
  add column if not exists school_response_at timestamptz;

create index if not exists student_help_school_follow_up_idx
on public.student_help_cases(next_school_follow_up_at)
where outreach_sent_at is not null and school_response_at is null;

comment on column public.student_help_cases.department_email_source is 'Public official school webpage used by staff to verify the department address.';
comment on column public.student_help_cases.outreach_approved_by is 'EFF staff member who approved the first school contact after reviewing consent, destination, and message.';
