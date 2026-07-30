alter table public.reach_ambassadors
  add column if not exists login_email citext,
  add column if not exists claim_token_hash text,
  add column if not exists claim_token_expires_at timestamptz,
  add column if not exists claim_link_sent_at timestamptz;

create unique index if not exists reach_ambassadors_login_email_unique_idx
on public.reach_ambassadors(login_email)
where login_email is not null;

create unique index if not exists reach_ambassadors_claim_token_hash_unique_idx
on public.reach_ambassadors(claim_token_hash)
where claim_token_hash is not null;

update public.reach_ambassadors
set login_email = email
where user_id is not null
  and login_email is null;

insert into public.reach_ambassadors (
  email,
  full_name,
  institution,
  active,
  invited_at,
  accepted_at
)
values
  ('abarnett15@pvamu.edu', 'Aaliyah Barnett', 'Prairie View A&M University', true, now(), now()),
  ('aneshagoodman0219@icloud.com', 'A''Nesha Goodman', null, true, now(), now())
on conflict (email) do update set
  full_name = coalesce(public.reach_ambassadors.full_name, excluded.full_name),
  institution = coalesce(public.reach_ambassadors.institution, excluded.institution),
  active = true,
  invited_at = coalesce(public.reach_ambassadors.invited_at, excluded.invited_at),
  accepted_at = coalesce(public.reach_ambassadors.accepted_at, excluded.accepted_at),
  updated_at = now();

comment on column public.reach_ambassadors.email is
  'Original invitation and contact email. A private claim link is delivered here.';
comment on column public.reach_ambassadors.login_email is
  'Verified EFF Portal email selected by the ambassador; it may differ from the invitation email.';
comment on column public.reach_ambassadors.claim_token_hash is
  'SHA-256 hash of the current one-time ambassador claim token. Raw tokens are never stored.';
comment on table public.reach_ambassadors is
  'Active REACH Ambassador roster. A private link sent to the invitation inbox may be connected to any verified portal email controlled by the ambassador.';
