alter table public.reach_ambassador_applications
  add column if not exists login_email citext;

update public.reach_ambassador_applications
set login_email = email
where login_email is null;

alter table public.reach_ambassador_applications
  alter column login_email set not null;

create unique index if not exists reach_ambassador_applications_login_email_unique
on public.reach_ambassador_applications(login_email);

comment on column public.reach_ambassador_applications.email is
  'Applicant contact email. This may differ from the secure portal login email.';

comment on column public.reach_ambassador_applications.login_email is
  'Applicant-selected email used for the secure REACH account, acceptance delivery, and ambassador roster match.';
