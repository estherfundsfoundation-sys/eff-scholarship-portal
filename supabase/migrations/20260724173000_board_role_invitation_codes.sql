create table if not exists public.board_role_invites(
  id uuid primary key default gen_random_uuid(),
  invite_label text not null,
  code_hash text not null unique,
  intended_email text,
  role_title text not null,
  board_responsibilities text not null,
  governance_scope text not null,
  voting_scope text not null,
  expires_at timestamptz not null,
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists board_role_invites_active_idx
on public.board_role_invites(code_hash,expires_at)
where claimed_by is null and revoked_at is null;

alter table public.board_role_invites enable row level security;
revoke all on public.board_role_invites from anon, authenticated;
