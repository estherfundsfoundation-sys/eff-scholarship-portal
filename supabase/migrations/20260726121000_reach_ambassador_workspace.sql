create table if not exists public.reach_ambassadors (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  full_name text,
  institution text,
  user_id uuid unique references public.profiles(id) on delete set null,
  active boolean not null default true,
  invited_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reach_ambassadors_active_idx
on public.reach_ambassadors(active, claimed_at desc);

create table if not exists public.reach_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'Workshop toolkit',
  resource_url text not null,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reach_activity_submissions (
  id uuid primary key default gen_random_uuid(),
  ambassador_id uuid not null references public.reach_ambassadors(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_type text not null check (activity_type in ('workshop','outreach','tabling','presentation','partnership','other')),
  title text not null,
  campus text not null,
  activity_date date not null,
  description text not null,
  students_reached integer check (students_reached is null or students_reached between 0 and 100000),
  photo_paths jsonb not null default '[]'::jsonb,
  public_photo_paths jsonb not null default '[]'::jsonb,
  consent_confirmed boolean not null default false,
  status text not null default 'pending_review' check (status in ('pending_review','approved','published','changes_requested','not_published')),
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reach_activity_review_idx
on public.reach_activity_submissions(status, created_at desc);

alter table public.reach_ambassadors enable row level security;
alter table public.reach_resources enable row level security;
alter table public.reach_activity_submissions enable row level security;
revoke all on public.reach_ambassadors from anon, authenticated;
revoke all on public.reach_resources from anon, authenticated;
revoke all on public.reach_activity_submissions from anon, authenticated;

grant select on public.reach_ambassadors to authenticated;
drop policy if exists "reach_ambassador_owner_read" on public.reach_ambassadors;
create policy "reach_ambassador_owner_read"
on public.reach_ambassadors
for select
to authenticated
using (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reach-ambassador-uploads',
  'reach-ambassador-uploads',
  false,
  6291456,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reach-impact-media',
  'reach-impact-media',
  true,
  6291456,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on table public.reach_ambassadors is 'National Office approved REACH Ambassador allowlist. Portal access requires a verified auth email match.';
comment on table public.reach_resources is 'Workshop and outreach resources visible to approved REACH Ambassadors.';
comment on table public.reach_activity_submissions is 'Private ambassador campus activity reports and images pending National Office review before publication.';
