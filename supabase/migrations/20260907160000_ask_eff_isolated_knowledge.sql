-- Ask EFF additive namespace. This migration does not alter any existing portal table.
create table if not exists public.ask_eff_program_registry (
  id uuid primary key default gen_random_uuid(),
  program_id text not null,
  official_name text not null,
  description text not null,
  audience text not null,
  canonical_url text not null,
  contact text,
  eligibility_summary text not null default '',
  cost_description text not null default '',
  status text not null check (status in ('open','paused','closed','coming_soon','unknown')),
  effective_from timestamptz,
  effective_until timestamptz,
  source_reference text not null,
  approval_status text not null check (approval_status in ('draft','approved','retired')) default 'draft',
  approved_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_due_at timestamptz,
  version integer not null check (version > 0) default 1,
  supersedes_id uuid references public.ask_eff_program_registry(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(program_id, version)
);

create table if not exists public.ask_eff_knowledge_records (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('official_fact','current_status','policy','procedure','public_role','response_example','voice_value')),
  organization text not null,
  topic text not null,
  trigger_question text,
  information_needed text,
  applicable_policy text,
  approved_answer text not null,
  required_action text,
  escalation_rule text,
  canonical_url text,
  prohibited_alternatives text,
  visibility text not null check (visibility in ('public','restricted_chapter','restricted_national')) default 'public',
  publication_status text not null check (publication_status in ('draft','reviewed','published','retired')) default 'draft',
  effective_from timestamptz,
  effective_until timestamptz,
  source_reference text not null,
  knowledge_owner text,
  reviewed_at timestamptz,
  review_due_at timestamptz,
  version integer not null check (version > 0) default 1,
  supersedes_id uuid references public.ask_eff_knowledge_records(id),
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ask_eff_knowledge_public_lookup on public.ask_eff_knowledge_records(publication_status, visibility, organization, category);

create table if not exists public.ask_eff_public_chapters (
  id uuid primary key default gen_random_uuid(),
  institution_name text not null,
  institution_aliases text[] not null default '{}',
  organization text not null,
  chapter_type text not null,
  operational_status text not null check (operational_status in ('active','prospective','interest_group','inactive','unknown')),
  public_contact text,
  canonical_url text,
  publication_status text not null check (publication_status in ('draft','published','retired')) default 'draft',
  source_reference text not null,
  reviewed_at timestamptz,
  review_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ask_eff_public_contacts (
  id uuid primary key default gen_random_uuid(),
  display_name text,
  official_role text not null,
  organization text not null,
  chapter_id uuid references public.ask_eff_public_chapters(id),
  role_started_on date,
  role_ended_on date,
  organizational_contact text not null,
  public_biography text,
  publication_permission boolean not null default false,
  publication_status text not null check (publication_status in ('draft','published','retired')) default 'draft',
  source_reference text not null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ask_eff_knowledge_gaps (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  organization text,
  gap_type text not null check (gap_type in ('missing','partial','conflicting','outdated','reported_inaccuracy')),
  notes text,
  status text not null check (status in ('open','reviewing','resolved','dismissed')) default 'open',
  source_record_ids uuid[] not null default '{}',
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ask_eff_feedback (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  conversation_id uuid not null,
  message_id uuid not null,
  answer_helpful boolean,
  consent_to_share boolean not null default false,
  answer text,
  last_question text,
  status text not null check (status in ('new','reviewing','resolved','dismissed')) default 'new',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.ask_eff_usage_daily (
  usage_day date not null,
  subject_hash text not null,
  request_count integer not null default 0,
  reserved_cost_micros bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (usage_day, subject_hash)
);

create table if not exists public.ask_eff_usage_requests (
  request_id uuid primary key,
  usage_day date not null,
  subject_hash text not null,
  reserved_cost_micros bigint not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ask_eff_admin_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  record_type text not null,
  record_id text not null,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ask_eff_runtime_settings (
  id smallint primary key default 1 check (id = 1),
  generation_enabled boolean not null default true,
  web_search_enabled boolean not null default false,
  requests_per_user_per_day integer not null check (requests_per_user_per_day between 1 and 100) default 10,
  daily_budget_usd numeric(10,2) not null check (daily_budget_usd between 0.10 and 10000) default 5.00,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

insert into public.ask_eff_runtime_settings(id) values (1) on conflict (id) do nothing;

alter table public.ask_eff_program_registry enable row level security;
alter table public.ask_eff_knowledge_records enable row level security;
alter table public.ask_eff_public_chapters enable row level security;
alter table public.ask_eff_public_contacts enable row level security;
alter table public.ask_eff_knowledge_gaps enable row level security;
alter table public.ask_eff_feedback enable row level security;
alter table public.ask_eff_usage_daily enable row level security;
alter table public.ask_eff_usage_requests enable row level security;
alter table public.ask_eff_admin_audit enable row level security;
alter table public.ask_eff_runtime_settings enable row level security;

revoke all on public.ask_eff_program_registry from anon, authenticated;
revoke all on public.ask_eff_knowledge_records from anon, authenticated;
revoke all on public.ask_eff_public_chapters from anon, authenticated;
revoke all on public.ask_eff_public_contacts from anon, authenticated;
revoke all on public.ask_eff_knowledge_gaps from anon, authenticated;
revoke all on public.ask_eff_feedback from anon, authenticated;
revoke all on public.ask_eff_usage_daily from anon, authenticated;
revoke all on public.ask_eff_usage_requests from anon, authenticated;
revoke all on public.ask_eff_admin_audit from anon, authenticated;
revoke all on public.ask_eff_runtime_settings from anon, authenticated;

create or replace function public.reserve_ask_eff_usage(
  p_subject_hash text,
  p_request_id uuid,
  p_estimated_cost_micros bigint,
  p_max_requests integer,
  p_daily_budget_micros bigint
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_count integer;
  v_total_reserved bigint;
begin
  if p_subject_hash is null or length(p_subject_hash) < 32 or p_estimated_cost_micros <= 0 then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_request');
  end if;
  perform pg_advisory_xact_lock(hashtext('ask_eff_budget:' || current_date::text));
  if exists(select 1 from public.ask_eff_usage_requests where request_id = p_request_id) then
    return jsonb_build_object('allowed', false, 'reason', 'duplicate_request');
  end if;
  insert into public.ask_eff_usage_daily(usage_day, subject_hash, request_count, reserved_cost_micros)
  values(current_date, p_subject_hash, 0, 0)
  on conflict (usage_day, subject_hash) do nothing;
  select request_count into v_current_count from public.ask_eff_usage_daily
    where usage_day = current_date and subject_hash = p_subject_hash for update;
  if v_current_count >= p_max_requests then
    return jsonb_build_object('allowed', false, 'reason', 'user_limit');
  end if;
  select coalesce(sum(reserved_cost_micros), 0) into v_total_reserved
    from public.ask_eff_usage_daily where usage_day = current_date;
  if v_total_reserved + p_estimated_cost_micros > p_daily_budget_micros then
    return jsonb_build_object('allowed', false, 'reason', 'daily_budget');
  end if;
  update public.ask_eff_usage_daily
    set request_count = request_count + 1,
        reserved_cost_micros = reserved_cost_micros + p_estimated_cost_micros,
        updated_at = now()
    where usage_day = current_date and subject_hash = p_subject_hash;
  insert into public.ask_eff_usage_requests(request_id, usage_day, subject_hash, reserved_cost_micros)
    values(p_request_id, current_date, p_subject_hash, p_estimated_cost_micros);
  return jsonb_build_object('allowed', true, 'reason', 'reserved');
end;
$$;

revoke all on function public.reserve_ask_eff_usage(text, uuid, bigint, integer, bigint) from public, anon, authenticated;
grant execute on function public.reserve_ask_eff_usage(text, uuid, bigint, integer, bigint) to service_role;
