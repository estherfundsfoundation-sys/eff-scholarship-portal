create table if not exists public.eff_partner_institutions (
  id uuid primary key default gen_random_uuid(),
  college_unitid integer references public.college_directory(unitid) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  legal_name text not null,
  display_name text not null,
  institution_type text not null,
  city text,
  state text,
  website_url text,
  logo_url text,
  public_summary text,
  primary_contact_name text not null,
  primary_contact_title text not null,
  primary_contact_email citext not null,
  primary_contact_phone text,
  liaison_department text not null,
  status text not null default 'pending'
    check (status in ('draft','pending','approved','active','paused','declined')),
  designation text not null default 'partner'
    check (designation in ('partner','institute')),
  public_profile boolean not null default false,
  accepts_eff_referrals boolean not null default true,
  offers_pre_stopout_review boolean not null default true,
  provides_written_resolution_path boolean not null default true,
  coordinates_with_eff boolean not null default true,
  shares_anonymized_outcomes boolean not null default true,
  application_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  approved_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists eff_partner_institutions_public_idx
on public.eff_partner_institutions(status,public_profile,state,display_name);

create index if not exists eff_partner_institutions_unitid_idx
on public.eff_partner_institutions(college_unitid);

create table if not exists public.eff_partner_members (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.eff_partner_institutions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'owner'
    check (member_role in ('owner','administrator','liaison','viewer')),
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(institution_id,user_id)
);

create table if not exists public.eff_partner_activity (
  id bigint generated always as identity primary key,
  institution_id uuid not null references public.eff_partner_institutions(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  detail_safe jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.eff_partner_institutions enable row level security;
alter table public.eff_partner_members enable row level security;
alter table public.eff_partner_activity enable row level security;

create policy "partner_public_profiles_read"
on public.eff_partner_institutions for select
using (public_profile and status in ('approved','active'));

create policy "partner_member_institution_read"
on public.eff_partner_institutions for select to authenticated
using (
  exists (
    select 1 from public.eff_partner_members m
    where m.institution_id=id and m.user_id=auth.uid()
  )
  or public.has_role('program_admin')
  or public.has_role('super_admin')
);

create policy "partner_members_self_read"
on public.eff_partner_members for select to authenticated
using (
  user_id=auth.uid()
  or public.has_role('program_admin')
  or public.has_role('super_admin')
);

create policy "partner_activity_member_read"
on public.eff_partner_activity for select to authenticated
using (
  exists (
    select 1 from public.eff_partner_members m
    where m.institution_id=eff_partner_activity.institution_id
      and m.user_id=auth.uid()
  )
  or public.has_role('program_admin')
  or public.has_role('super_admin')
);

grant select on public.eff_partner_institutions to anon,authenticated;
grant select on public.eff_partner_members to authenticated;
grant select on public.eff_partner_activity to authenticated;

comment on table public.eff_partner_institutions is
'Free Every Future Fulfilled College Continuity Partner applications and approved public partner profiles.';

comment on column public.eff_partner_institutions.designation is
'Partner is the entry designation; Institute is earned after verified student-continuity performance.';
