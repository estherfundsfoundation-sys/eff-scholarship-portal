create table if not exists public.beyond_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  stage text not null check(stage in ('Recent graduate','Graduate student','Early-career professional','Career transition','Established professional')),
  city text not null,
  state text not null,
  alma_mater text not null,
  graduation_year int not null check(graduation_year between 1950 and 2100),
  industry text,
  role_title text,
  interests text[] not null default '{}',
  faith_interest boolean not null default false,
  career_goals text,
  navigating_now text,
  support_seeking text,
  can_help_with text,
  connection_goals text[] not null default '{}',
  directory_visible boolean not null default false,
  community_pledge_at timestamptz,
  privacy_pledge_at timestamptz,
  onboarding_completed_at timestamptz,
  status text not null default 'active' check(status in ('active','paused','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.beyond_circles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind text not null,
  description text not null,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.beyond_circle_members (
  circle_id uuid not null references public.beyond_circles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check(role in ('member','host','national_lead')),
  joined_at timestamptz not null default now(),
  primary key(circle_id,user_id)
);

insert into public.beyond_circles(slug,name,kind,description,sort_order) values
('new-to-the-city','New to the City','Life season','A soft landing for graduates building community in a new place.',10),
('first-gen-beyond','First-Gen Beyond','Shared experience','Navigate work, money, family expectations, and the unwritten rules together.',20),
('faith-and-work','Faith & Work','Faith','Honest conversation about purpose, calling, work, and spiritual rhythm.',30),
('career-pivot','The Career Pivot','Career','For members changing fields, rebuilding confidence, or deciding what comes next.',40),
('beyond-brotherhood','Beyond Brotherhood','Community','Connection, accountability, and honest support for men after college.',50),
('beyond-sisterhood','Beyond Sisterhood','Community','Friendship, faith, professional growth, and support for women after college.',60)
on conflict(slug) do update set name=excluded.name,kind=excluded.kind,description=excluded.description,sort_order=excluded.sort_order;

alter table public.beyond_profiles enable row level security;
alter table public.beyond_circles enable row level security;
alter table public.beyond_circle_members enable row level security;

drop policy if exists "Beyond members manage own profile" on public.beyond_profiles;
create policy "Beyond members manage own profile" on public.beyond_profiles for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "Active Beyond circles are readable" on public.beyond_circles;
create policy "Active Beyond circles are readable" on public.beyond_circles for select to anon,authenticated using(active=true);
drop policy if exists "Members read own Circle memberships" on public.beyond_circle_members;
create policy "Members read own Circle memberships" on public.beyond_circle_members for select to authenticated using(auth.uid()=user_id);
drop policy if exists "Members join Circles" on public.beyond_circle_members;
create policy "Members join Circles" on public.beyond_circle_members for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists "Members leave Circles" on public.beyond_circle_members;
create policy "Members leave Circles" on public.beyond_circle_members for delete to authenticated using(auth.uid()=user_id);

create index if not exists beyond_profiles_location_idx on public.beyond_profiles(state,city);
create index if not exists beyond_profiles_stage_idx on public.beyond_profiles(stage) where status='active';
create index if not exists beyond_profiles_interests_idx on public.beyond_profiles using gin(interests);
create index if not exists beyond_circle_members_user_idx on public.beyond_circle_members(user_id);

revoke all on public.beyond_profiles from anon;
grant select,insert,update,delete on public.beyond_profiles to authenticated;
grant select on public.beyond_circles to anon,authenticated;
grant select,insert,delete on public.beyond_circle_members to authenticated;
