alter table public.applications add column if not exists claimed_at timestamptz;

create table if not exists public.application_history_events(
 id bigint generated always as identity primary key,
 application_id uuid references public.applications on delete cascade,
 legacy_record_id uuid references public.legacy_application_records on delete cascade,
 event_type text not null,actor_id uuid references public.profiles,
 details_safe jsonb not null default '{}',happened_at timestamptz not null default now());
create index if not exists application_history_application_idx on public.application_history_events(application_id,happened_at,id);
alter table public.application_history_events enable row level security;
create policy "history_owner_or_staff_read" on public.application_history_events for select to authenticated using(
 exists(select 1 from public.applications a where a.id=application_id and a.applicant_id=auth.uid()) or public.has_role('program_admin') or public.has_role('super_admin'));

create table if not exists public.legacy_document_references(
 id uuid primary key default gen_random_uuid(),legacy_record_id uuid not null references public.legacy_application_records on delete cascade,
 application_id uuid not null references public.applications on delete cascade,owner_id uuid not null references public.profiles,
 kind text not null,source_url text not null,transferred_at timestamptz not null default now(),unique(application_id,kind,source_url));
alter table public.legacy_document_references enable row level security;
create policy "legacy_document_owner_or_staff_read" on public.legacy_document_references for select to authenticated using(
 owner_id=auth.uid() or public.has_role('program_admin') or public.has_role('super_admin'));

create or replace function public.has_unclaimed_legacy_application() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.legacy_application_records r join auth.users u on u.id=auth.uid()
  where lower(r.email::text)=lower(u.email) and r.status in('committed','invited') and r.application_id is null)
$$;
revoke all on function public.has_unclaimed_legacy_application() from public,anon;
grant execute on function public.has_unclaimed_legacy_application() to authenticated;

create or replace function public.claim_legacy_application(p_token text)
returns uuid language plpgsql security definer set search_path=public,extensions as $$
declare caller uuid:=auth.uid();caller_email citext;token_row public.legacy_claim_tokens;record_row public.legacy_application_records;
 cycle_row public.program_cycles;form_id uuid;new_application uuid;existing_owner uuid;prior_status public.application_status;final_status public.application_status:='applied';doc_count int:=0;
begin
 if caller is null then raise exception 'CLAIM_SIGN_IN_REQUIRED';end if;
 select email into caller_email from auth.users where id=caller;
 select * into token_row from public.legacy_claim_tokens where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
 if token_row.id is null then raise exception 'CLAIM_RECORD_NOT_FOUND';end if;
 if token_row.cancelled_at is not null then raise exception 'CLAIM_LINK_REPLACED';end if;
 if token_row.expires_at<=now() then raise exception 'CLAIM_LINK_EXPIRED';end if;
 if lower(token_row.email::text)<>lower(caller_email::text) then raise exception 'CLAIM_WRONG_EMAIL';end if;
 select * into record_row from public.legacy_application_records where id=token_row.legacy_record_id for update;
 if record_row.id is null then raise exception 'CLAIM_APPLICATION_NOT_FOUND';end if;
 if token_row.claimed_at is not null or record_row.status='claimed' then
  if record_row.claimed_by=caller and record_row.application_id is not null then raise exception 'CLAIM_ALREADY_CONNECTED';end if;
  raise exception 'CLAIM_ALREADY_USED';
 end if;
 select c.* into cycle_row from public.program_cycles c join public.programs p on p.id=c.program_id where p.slug='name-your-need' and c.name='2026';
 select id into form_id from public.form_versions where cycle_id=cycle_row.id and published_at is not null order by version desc limit 1;
 if cycle_row.id is null or form_id is null then raise exception 'CLAIM_TEMPORARY_SYSTEM_ERROR';end if;
 select id,applicant_id,status into new_application,existing_owner,prior_status from public.applications
  where source_system=record_row.source_system and source_record_id=record_row.source_record_id for update;
 if new_application is not null and existing_owner<>caller then raise exception 'CLAIM_ALREADY_CONNECTED_OTHER_ACCOUNT';end if;
 if new_application is null then select id,applicant_id,status into new_application,existing_owner,prior_status from public.applications where cycle_id=cycle_row.id and applicant_id=caller for update;end if;
 if new_application is null then
  insert into public.applications(applicant_id,cycle_id,form_version_id,status,source_system,source_record_id,original_submitted_at,submitted_at,claimed_at)
  values(caller,cycle_row.id,form_id,'applied',record_row.source_system,record_row.source_record_id,record_row.original_submitted_at,record_row.original_submitted_at,now()) returning id into new_application;
  prior_status:=null;
 else
  final_status:=case when prior_status in('review_by_admin','additional_information_needed','approved','denied') then prior_status else 'applied'::public.application_status end;
  update public.applications set source_system=record_row.source_system,source_record_id=record_row.source_record_id,
   original_submitted_at=record_row.original_submitted_at,submitted_at=record_row.original_submitted_at,claimed_at=now(),status=final_status,updated_at=now()
  where id=new_application;
 end if;
 insert into public.application_answers(application_id,question_key,value,updated_at)
  select new_application,key,to_jsonb(value),now() from jsonb_each_text(record_row.normalized_data)
  on conflict(application_id,question_key) do update set value=excluded.value,updated_at=now();
 insert into public.legacy_document_references(legacy_record_id,application_id,owner_id,kind,source_url)
  select record_row.id,new_application,caller,v.kind,v.url from (values
   ('headshot',record_row.normalized_data->>'headshot_url'),('enrollment_proof',record_row.normalized_data->>'enrollment_proof_url'),
   ('financial_need_proof',record_row.normalized_data->>'financial_need_proof_url'),('supporting_document',record_row.normalized_data->>'optional_supporting_url'))v(kind,url)
  where nullif(trim(v.url),'') is not null on conflict do nothing;
 get diagnostics doc_count=row_count;
 update public.profiles set legal_name=coalesce(nullif(record_row.normalized_data->>'legal_name',''),legal_name),
  preferred_name=coalesce(nullif(record_row.normalized_data->>'preferred_name',''),preferred_name),phone=coalesce(nullif(record_row.normalized_data->>'phone',''),phone),
  institution=coalesce(nullif(record_row.normalized_data->>'institution',''),institution),major=coalesce(nullif(record_row.normalized_data->>'major',''),major),updated_at=now() where id=caller;
 update public.legacy_application_records set status='claimed',claimed_by=caller,application_id=new_application,updated_at=now() where id=record_row.id;
 update public.legacy_claim_tokens set claimed_at=now() where id=token_row.id;
 insert into public.status_history(application_id,previous_status,new_status,actor_id,reason,applicant_note)
  values(new_application,prior_status,final_status,caller,'Legacy claim preserved original date, status, answers, and document references.','Your existing Name Your Need application is connected to your portal account.');
 insert into public.application_history_events(application_id,legacy_record_id,event_type,actor_id,details_safe,happened_at) values
  (new_application,record_row.id,'original_submission',null,jsonb_build_object('source',record_row.source_system),coalesce(record_row.original_submitted_at,record_row.created_at)),
  (new_application,record_row.id,'legacy_import',null,jsonb_build_object('source_record_id',record_row.source_record_id),record_row.created_at),
  (new_application,record_row.id,'application_claimed',caller,jsonb_build_object('prior_status',prior_status),now()),
  (new_application,record_row.id,'documents_transferred',caller,jsonb_build_object('reference_count',doc_count),now());
 insert into public.audit_events(actor_id,action,target_type,target_id,metadata_safe) values(caller,'legacy_application_claimed','application',new_application::text,jsonb_build_object('legacy_record_id',record_row.id,'prior_status',prior_status,'documents',doc_count));
 return new_application;
exception when others then if sqlerrm like 'CLAIM_%' then raise;end if;raise exception 'CLAIM_TEMPORARY_SYSTEM_ERROR';end $$;
revoke all on function public.claim_legacy_application(text) from public,anon;
grant execute on function public.claim_legacy_application(text) to authenticated;

drop function if exists public.withdraw_application(uuid,text);
create function public.withdraw_application(p_application_id uuid,p_reason text,p_warning_confirmed boolean,p_confirmation text)
returns void language plpgsql security definer set search_path=public as $$
declare caller uuid:=auth.uid();old_status public.application_status;
begin
 if caller is null then raise exception 'Please sign in again.';end if;
 if p_warning_confirmed is not true or upper(trim(coalesce(p_confirmation,'')))<>'WITHDRAW' then raise exception 'Withdrawal requires both confirmations.';end if;
 select status into old_status from public.applications where id=p_application_id and applicant_id=caller for update;
 if old_status is null or old_status not in('draft','applied','review_by_admin','additional_information_needed') then raise exception 'This application cannot be withdrawn online.';end if;
 update public.applications set status='withdrawn',updated_at=now() where id=p_application_id;
 insert into public.status_history(application_id,previous_status,new_status,actor_id,reason,applicant_note) values(p_application_id,old_status,'withdrawn',caller,coalesce(nullif(trim(p_reason),''),'Applicant requested withdrawal.'),'You withdrew this application. Contact EFF if this was accidental.');
 insert into public.application_history_events(application_id,event_type,actor_id,details_safe) values(p_application_id,'application_withdrawn',caller,jsonb_build_object('from',old_status));
 insert into public.audit_events(actor_id,action,target_type,target_id,metadata_safe) values(caller,'application_withdrawn','application',p_application_id::text,jsonb_build_object('from',old_status,'double_confirmed',true));
end $$;
revoke all on function public.withdraw_application(uuid,text,boolean,text) from public,anon;
grant execute on function public.withdraw_application(uuid,text,boolean,text) to authenticated;

create or replace function public.resend_legacy_claim_invitation(p_legacy_record_id uuid,p_site_url text)
returns void language plpgsql security definer set search_path=public,extensions as $$
declare actor uuid:=auth.uid();r public.legacy_application_records;raw_token text;token_id uuid;
begin
 if actor is null or not(public.has_role('program_admin') or public.has_role('super_admin')) then raise exception 'Administrator access required.';end if;
 select * into r from public.legacy_application_records where id=p_legacy_record_id for update;
 if r.id is null or r.status in('excluded','error') then raise exception 'This legacy record cannot be invited.';end if;
 if r.status='claimed' then raise exception 'This application is already claimed.';end if;
 update public.legacy_claim_tokens set cancelled_at=now() where legacy_record_id=r.id and claimed_at is null and cancelled_at is null;
 raw_token:=encode(extensions.gen_random_bytes(32),'hex');
 insert into public.legacy_claim_tokens(legacy_record_id,email,token_hash,expires_at,created_by) values(r.id,r.email,encode(extensions.digest(raw_token,'sha256'),'hex'),now()+interval '14 days',actor) returning id into token_id;
 insert into public.messages(recipient,idempotency_key,legacy_token_id,status,payload_private,template_key,next_attempt_at) values(r.email,'legacy-claim-resend:'||r.id::text||':'||token_id::text,token_id,'queued',jsonb_build_object('name',coalesce(r.normalized_data->>'preferred_name',r.normalized_data->>'legal_name','Applicant'),'claim_url',rtrim(p_site_url,'/')||'/claim/'||raw_token),'legacy_claim',now());
 update public.legacy_application_records set status='invited',updated_at=now() where id=r.id;
 insert into public.application_history_events(application_id,legacy_record_id,event_type,actor_id,details_safe) values(r.application_id,r.id,'invitation_resent',actor,jsonb_build_object('expires_at',now()+interval '14 days'));
 insert into public.audit_events(actor_id,action,target_type,target_id,metadata_safe) values(actor,'legacy_claim_invitation_resent','legacy_application',r.id::text,jsonb_build_object('token_id',token_id));
end $$;
revoke all on function public.resend_legacy_claim_invitation(uuid,text) from public,anon;
grant execute on function public.resend_legacy_claim_invitation(uuid,text) to authenticated;

update public.applications a set original_submitted_at=r.original_submitted_at,submitted_at=r.original_submitted_at,
 claimed_at=coalesce(a.claimed_at,t.claimed_at),updated_at=now()
from public.legacy_application_records r left join lateral(select claimed_at from public.legacy_claim_tokens where legacy_record_id=r.id and claimed_at is not null order by claimed_at desc limit 1)t on true
where r.application_id=a.id and r.original_submitted_at is not null and
 (a.original_submitted_at is distinct from r.original_submitted_at or a.submitted_at is distinct from r.original_submitted_at or a.claimed_at is null);
