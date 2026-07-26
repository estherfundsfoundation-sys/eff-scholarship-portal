alter table public.reach_ambassador_profiles
  alter column status set default 'published';

comment on table public.reach_ambassador_profiles is
  'Opt-in public REACH Ambassador profiles. Ambassadors publish their own profiles after explicit consent; public pages expose only status=published rows.';

comment on table public.reach_activity_submissions is
  'Ambassador campus activity reports. New submissions are published only after the ambassador confirms public-sharing permission and privacy requirements.';
