alter table public.national_member_profiles
  add column if not exists board_role_status text not null default 'not_offered'
    check (board_role_status in ('not_offered','offered','accepted_pending_board_action','appointed','declined','ended')),
  add column if not exists board_responsibilities text,
  add column if not exists governance_scope text,
  add column if not exists voting_scope text,
  add column if not exists public_email text,
  add column if not exists headshot_path text,
  add column if not exists role_offered_at timestamptz,
  add column if not exists role_responded_at timestamptz,
  add column if not exists formally_appointed_at timestamptz,
  add column if not exists fiduciary_acknowledged boolean not null default false,
  add column if not exists confidentiality_acknowledged boolean not null default false,
  add column if not exists conflicts_acknowledged boolean not null default false,
  add column if not exists unpaid_service_acknowledged boolean not null default false,
  add column if not exists electronic_signature text;

create table if not exists public.board_role_history(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  previous_status text,
  new_status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.board_role_history enable row level security;
revoke all on public.board_role_history from anon, authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'board-headshots',
  'board-headshots',
  false,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public=false,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

create policy "board_headshots_owner_read"
on storage.objects for select to authenticated
using (
  bucket_id='board-headshots'
  and (storage.foldername(name))[1]=auth.uid()::text
);

revoke update (
  role_title,
  membership_status,
  board_role_status,
  board_responsibilities,
  governance_scope,
  voting_scope,
  role_offered_at,
  formally_appointed_at
) on public.national_member_profiles from authenticated;

grant update (
  display_name,
  school_or_employer,
  degree_or_field,
  location_timezone,
  short_bio,
  strengths,
  service_focus,
  availability,
  linkedin_url,
  public_email,
  headshot_path,
  role_responded_at,
  fiduciary_acknowledged,
  confidentiality_acknowledged,
  conflicts_acknowledged,
  unpaid_service_acknowledged,
  electronic_signature,
  updated_at
) on public.national_member_profiles to authenticated;
