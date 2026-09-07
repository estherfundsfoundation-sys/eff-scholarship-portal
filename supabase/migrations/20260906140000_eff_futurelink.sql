-- EFF FutureLink: verified, consent-based mentorship with automatic matching.
create table if not exists public.futurelink_profiles(
  user_id uuid primary key references public.profiles(id) on delete cascade,
  participant_type text not null check(participant_type in('student_mentee','student_peer_mentor','student_both','professional_mentor')),
  status text not null default 'application_started' check(status in('application_started','email_verification_required','verification_pending','additional_documents_required','approved','match_eligible','searching_for_match','match_proposed','awaiting_mentor_acceptance','awaiting_mentee_acceptance','agreement_required','active_match','paused','rematch_requested','safety_review','suspended','completed','banned')),
  verification_status text not null default 'pending' check(verification_status in('pending','additional_documents_required','approved','rejected')),
  legal_name text not null, display_name text not null, date_of_birth date not null,
  school_email citext, school text, degree_level text, academic_field text, minor_field text, graduation_year int,
  classification text, college_attended text, profession text, years_experience int,
  career_fields text[] not null default '{}', industries text[] not null default '{}',
  support_needed text[] not null default '{}', support_offered text[] not null default '{}', experience_tags text[] not null default '{}',
  city text, state text, timezone text, hobbies text, bio text, why_joined text,
  meeting_format text, communication_styles text[] not null default '{}', meeting_cadence text,
  availability text[] not null default '{}', mentor_capacity int not null default 1 check(mentor_capacity between 1 and 5),
  approved_contact_methods text[] not null default '{}', phone_private text,
  profile_photo_path text, verification_document_path text, verification_document_name text, verification_document_type text,
  code_version text not null, code_accepted_at timestamptz not null, accuracy_confirmed boolean not null default false,
  adult_confirmed boolean not null default false, privacy_confirmed boolean not null default false,
  submitted_at timestamptz, verified_at timestamptz, verified_by uuid references public.profiles(id),
  review_note text, risk_flags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists futurelink_profile_queue_idx on public.futurelink_profiles(verification_status,status,submitted_at);
create index if not exists futurelink_profile_match_idx on public.futurelink_profiles(status,participant_type) where verification_status='approved';
create table if not exists public.futurelink_matches(
  id uuid primary key default gen_random_uuid(), mentee_id uuid not null references public.futurelink_profiles(user_id), mentor_id uuid not null references public.futurelink_profiles(user_id),
  score int not null check(score between 0 and 100), reasons jsonb not null default '[]'::jsonb,
  status text not null default 'proposed' check(status in('proposed','awaiting_mentor_acceptance','awaiting_mentee_acceptance','agreement_required','active','declined','ended','safety_hold','completed')),
  mentor_accepted_at timestamptz, mentee_accepted_at timestamptz, contact_released_at timestamptz,
  proposed_at timestamptz not null default now(), expires_at timestamptz not null default(now()+interval '7 days'), ended_at timestamptz, end_reason text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(mentee_id<>mentor_id)
);
create unique index if not exists futurelink_active_pair_idx on public.futurelink_matches(mentee_id,mentor_id) where status in('proposed','awaiting_mentor_acceptance','awaiting_mentee_acceptance','agreement_required','active');
create index if not exists futurelink_match_participants_idx on public.futurelink_matches(mentee_id,mentor_id,status);
create table if not exists public.futurelink_agreements(
  id uuid primary key default gen_random_uuid(), match_id uuid not null references public.futurelink_matches(id) on delete cascade,
  user_id uuid not null references public.futurelink_profiles(user_id), agreement_version text not null,
  legal_name text not null, signed_at timestamptz not null default now(), ip_hash text, user_agent_safe text,
  unique(match_id,user_id)
);
create table if not exists public.futurelink_sessions(
  id uuid primary key default gen_random_uuid(), match_id uuid not null references public.futurelink_matches(id) on delete cascade,
  mentor_id uuid not null references public.futurelink_profiles(user_id), mentee_id uuid not null references public.futurelink_profiles(user_id),
  session_date date not null, started_at time, duration_minutes int not null check(duration_minutes between 5 and 480),
  format text not null check(format in('Virtual','In person','Phone','Other')), category text not null,
  reflection text, status text not null default 'pending_mentee_confirmation' check(status in('pending_mentee_confirmation','confirmed','disputed','void')),
  mentee_note text, confirmed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.futurelink_reports(
  id uuid primary key default gen_random_uuid(), match_id uuid references public.futurelink_matches(id), reporter_id uuid not null references public.futurelink_profiles(user_id),
  reported_id uuid not null references public.futurelink_profiles(user_id), category text not null, details text not null,
  status text not null default 'open' check(status in('open','reviewing','resolved','dismissed')),
  assigned_to uuid references public.profiles(id), resolution_safe text, created_at timestamptz not null default now(), resolved_at timestamptz
);
create table if not exists public.futurelink_blocks(
  blocker_id uuid not null references public.futurelink_profiles(user_id), blocked_id uuid not null references public.futurelink_profiles(user_id),
  match_id uuid references public.futurelink_matches(id), created_at timestamptz not null default now(), primary key(blocker_id,blocked_id)
);
create table if not exists public.futurelink_service_verifications(
  id uuid primary key default gen_random_uuid(), mentor_id uuid not null references public.futurelink_profiles(user_id),
  verification_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
  confirmed_sessions int not null, confirmed_minutes int not null, issued_at timestamptz not null default now(), revoked_at timestamptz
);
alter table public.futurelink_profiles enable row level security;
alter table public.futurelink_matches enable row level security;
alter table public.futurelink_agreements enable row level security;
alter table public.futurelink_sessions enable row level security;
alter table public.futurelink_reports enable row level security;
alter table public.futurelink_blocks enable row level security;
alter table public.futurelink_service_verifications enable row level security;
create policy "futurelink own profile read" on public.futurelink_profiles for select to authenticated using(user_id=auth.uid());
create policy "futurelink staff profile manage" on public.futurelink_profiles for all to authenticated using(public.has_role('program_admin') or public.has_role('super_admin')) with check(public.has_role('program_admin') or public.has_role('super_admin'));
create policy "futurelink participant matches read" on public.futurelink_matches for select to authenticated using(auth.uid() in(mentee_id,mentor_id));
create policy "futurelink staff matches manage" on public.futurelink_matches for all to authenticated using(public.has_role('program_admin') or public.has_role('super_admin')) with check(public.has_role('program_admin') or public.has_role('super_admin'));
create policy "futurelink participant agreements read" on public.futurelink_agreements for select to authenticated using(exists(select 1 from public.futurelink_matches m where m.id=match_id and auth.uid() in(m.mentee_id,m.mentor_id)));
create policy "futurelink participant sessions read" on public.futurelink_sessions for select to authenticated using(auth.uid() in(mentor_id,mentee_id));
create policy "futurelink staff sessions manage" on public.futurelink_sessions for all to authenticated using(public.has_role('program_admin') or public.has_role('super_admin')) with check(public.has_role('program_admin') or public.has_role('super_admin'));
create policy "futurelink reporter reports read" on public.futurelink_reports for select to authenticated using(reporter_id=auth.uid());
create policy "futurelink staff reports manage" on public.futurelink_reports for all to authenticated using(public.has_role('program_admin') or public.has_role('super_admin')) with check(public.has_role('program_admin') or public.has_role('super_admin'));
create policy "futurelink own blocks read" on public.futurelink_blocks for select to authenticated using(blocker_id=auth.uid());
create policy "futurelink own verification read" on public.futurelink_service_verifications for select to authenticated using(mentor_id=auth.uid());
create policy "futurelink public verification read" on public.futurelink_service_verifications for select to anon using(revoked_at is null);
grant select on public.futurelink_profiles,public.futurelink_matches,public.futurelink_agreements,public.futurelink_sessions,public.futurelink_reports,public.futurelink_blocks,public.futurelink_service_verifications to authenticated;
grant select on public.futurelink_service_verifications to anon;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('futurelink-private','futurelink-private',false,8388608,array['image/jpeg','image/png','image/webp','application/pdf']),
 ('futurelink-profile-media','futurelink-profile-media',false,6291456,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create or replace function public.futurelink_create_match(p_mentee uuid,p_mentor uuid,p_score int,p_reasons text[])
returns uuid language plpgsql security definer set search_path=public as $$
declare created_id uuid;
begin
  if not exists(select 1 from futurelink_profiles where user_id=p_mentee and verification_status='approved' and status in('match_eligible','searching_for_match') and participant_type in('student_mentee','student_both')) then return null; end if;
  if not exists(select 1 from futurelink_profiles where user_id=p_mentor and verification_status='approved' and status in('match_eligible','searching_for_match') and participant_type in('student_peer_mentor','student_both','professional_mentor')) then return null; end if;
  if exists(select 1 from futurelink_blocks where(blocker_id=p_mentee and blocked_id=p_mentor)or(blocker_id=p_mentor and blocked_id=p_mentee)) then return null; end if;
  if exists(select 1 from futurelink_matches where mentee_id=p_mentee and status in('proposed','awaiting_mentor_acceptance','awaiting_mentee_acceptance','agreement_required','active')) then return null; end if;
  insert into futurelink_matches(mentee_id,mentor_id,score,reasons,status) values(p_mentee,p_mentor,p_score,to_jsonb(p_reasons),'proposed') returning id into created_id;
  update futurelink_profiles set status='match_proposed',updated_at=now() where user_id in(p_mentee,p_mentor);
  insert into audit_events(actor_id,action,target_type,target_id,metadata_safe) values(null,'futurelink_match_automatically_proposed','futurelink_match',created_id::text,jsonb_build_object('score',p_score));
  return created_id;
exception when unique_violation then return null;
end $$;
revoke all on function public.futurelink_create_match(uuid,uuid,int,text[]) from public,anon,authenticated;
grant execute on function public.futurelink_create_match(uuid,uuid,int,text[]) to service_role;
create or replace function public.futurelink_accept_match(p_match uuid,p_accept boolean)
returns text language plpgsql security definer set search_path=public as $$
declare m futurelink_matches%rowtype; caller uuid:=auth.uid(); next_status text;
begin
  select * into m from futurelink_matches where id=p_match and caller in(mentee_id,mentor_id) for update;
  if not found or m.status not in('proposed','awaiting_mentor_acceptance','awaiting_mentee_acceptance') then raise exception 'Match is not available'; end if;
  if not p_accept then
    update futurelink_matches set status='declined',ended_at=now(),updated_at=now() where id=p_match;
    update futurelink_profiles set status='searching_for_match',updated_at=now() where user_id in(m.mentee_id,m.mentor_id) and status not in('safety_review','suspended','banned');
    return 'declined';
  end if;
  if caller=m.mentor_id then update futurelink_matches set mentor_accepted_at=coalesce(mentor_accepted_at,now()),updated_at=now() where id=p_match;
  else update futurelink_matches set mentee_accepted_at=coalesce(mentee_accepted_at,now()),updated_at=now() where id=p_match; end if;
  select * into m from futurelink_matches where id=p_match;
  next_status:=case when m.mentor_accepted_at is not null and m.mentee_accepted_at is not null then 'agreement_required' when m.mentor_accepted_at is null then 'awaiting_mentor_acceptance' else 'awaiting_mentee_acceptance' end;
  update futurelink_matches set status=next_status,updated_at=now() where id=p_match;
  update futurelink_profiles set status=next_status,updated_at=now() where user_id in(m.mentee_id,m.mentor_id);
  return next_status;
end $$;
revoke all on function public.futurelink_accept_match(uuid,boolean) from public,anon;
grant execute on function public.futurelink_accept_match(uuid,boolean) to authenticated;
create or replace function public.futurelink_report_match(p_match uuid,p_category text,p_details text,p_block boolean default true)
returns uuid language plpgsql security definer set search_path=public as $$
declare m futurelink_matches%rowtype; caller uuid:=auth.uid(); other_id uuid; report_id uuid;
begin
  select * into m from futurelink_matches where id=p_match and caller in(mentee_id,mentor_id) for update;
  if not found then raise exception 'Match not found'; end if;
  other_id:=case when caller=m.mentee_id then m.mentor_id else m.mentee_id end;
  insert into futurelink_reports(match_id,reporter_id,reported_id,category,details) values(p_match,caller,other_id,p_category,left(p_details,4000)) returning id into report_id;
  update futurelink_matches set status='safety_hold',ended_at=now(),end_reason='Safety report submitted',contact_released_at=null,updated_at=now() where id=p_match;
  update futurelink_profiles set status='safety_review',updated_at=now() where user_id=other_id;
  update futurelink_profiles set status='searching_for_match',updated_at=now() where user_id=caller;
  if p_block then insert into futurelink_blocks(blocker_id,blocked_id,match_id) values(caller,other_id,p_match) on conflict do nothing; end if;
  insert into audit_events(actor_id,action,target_type,target_id,metadata_safe) values(caller,'futurelink_safety_report_created','futurelink_report',report_id::text,jsonb_build_object('category',p_category));
  return report_id;
end $$;
revoke all on function public.futurelink_report_match(uuid,text,text,boolean) from public,anon;
grant execute on function public.futurelink_report_match(uuid,text,text,boolean) to authenticated;
create or replace function public.futurelink_confirm_session(p_session uuid,p_confirm boolean,p_note text default null)
returns text language plpgsql security definer set search_path=public as $$
declare s futurelink_sessions%rowtype; caller uuid:=auth.uid(); new_status text;
begin
  select * into s from futurelink_sessions where id=p_session and mentee_id=caller for update;
  if not found or s.status<>'pending_mentee_confirmation' then raise exception 'Session is not available'; end if;
  new_status:=case when p_confirm then 'confirmed' else 'disputed' end;
  update futurelink_sessions set status=new_status,mentee_note=left(p_note,1000),confirmed_at=case when p_confirm then now() else null end,updated_at=now() where id=p_session;
  return new_status;
end $$;
revoke all on function public.futurelink_confirm_session(uuid,boolean,text) from public,anon;
grant execute on function public.futurelink_confirm_session(uuid,boolean,text) to authenticated;
