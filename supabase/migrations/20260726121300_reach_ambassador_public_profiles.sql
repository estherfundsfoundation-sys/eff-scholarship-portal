create table if not exists public.reach_ambassador_profiles (
  ambassador_id uuid primary key references public.reach_ambassadors(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  display_name text not null,
  headline text,
  institution text not null,
  major text,
  class_year text,
  bio text not null,
  why_reach text,
  focus_areas jsonb not null default '[]'::jsonb,
  instagram_url text,
  linkedin_url text,
  private_photo_path text,
  public_photo_path text,
  consent_confirmed boolean not null default false,
  status text not null default 'pending_review'
    check (status in ('pending_review','published','changes_requested','private')),
  review_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reach_ambassador_profiles_status_idx
on public.reach_ambassador_profiles(status, updated_at desc);

alter table public.reach_ambassador_profiles enable row level security;
revoke all on public.reach_ambassador_profiles from anon, authenticated;

comment on table public.reach_ambassador_profiles is
  'Opt-in public REACH Ambassador profiles. Only service-role reads may expose rows, and public pages must filter to status=published.';
