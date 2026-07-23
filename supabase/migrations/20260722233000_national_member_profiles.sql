create table if not exists public.national_member_profiles(
  user_id uuid primary key references auth.users(id) on delete cascade,
  role_title text,
  membership_status text not null default 'pending' check (membership_status in ('pending','active','inactive')),
  display_name text,
  school_or_employer text,
  degree_or_field text,
  location_timezone text,
  short_bio text,
  strengths text,
  service_focus text,
  availability text,
  linkedin_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.national_member_profiles enable row level security;

create policy "national_member_profiles_owner_read"
on public.national_member_profiles for select
using (auth.uid() = user_id);

create policy "national_member_profiles_owner_insert"
on public.national_member_profiles for insert
with check (auth.uid() = user_id);

create policy "national_member_profiles_owner_update"
on public.national_member_profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

revoke all on public.national_member_profiles from anon, authenticated;
grant select on public.national_member_profiles to authenticated;
grant insert (user_id,display_name,school_or_employer,degree_or_field,location_timezone,short_bio,strengths,service_focus,availability,linkedin_url,created_at,updated_at)
on public.national_member_profiles to authenticated;
grant update (display_name,school_or_employer,degree_or_field,location_timezone,short_bio,strengths,service_focus,availability,linkedin_url,updated_at)
on public.national_member_profiles to authenticated;

create table if not exists public.national_member_profile_history(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  previous_role text,
  new_role text,
  previous_status text,
  new_status text,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.national_member_profile_history enable row level security;
revoke all on public.national_member_profile_history from anon, authenticated;
