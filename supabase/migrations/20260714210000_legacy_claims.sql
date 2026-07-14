create table public.legacy_application_records(
 id uuid primary key default gen_random_uuid(), source_system text not null default 'name_your_need_legacy_2026', source_record_id text not null,
 email citext not null, original_submitted_at timestamptz, raw_data jsonb not null, normalized_data jsonb not null,
 status text not null default 'staged' check(status in('staged','committed','invited','claimed','excluded','error')),
 claimed_by uuid references public.profiles, application_id uuid references public.applications, import_job_id uuid references public.import_jobs,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(source_system,source_record_id)
);
create index legacy_records_email_idx on public.legacy_application_records(email);
alter table public.legacy_application_records enable row level security;
create policy "legacy_staff_read" on public.legacy_application_records for select to authenticated using(public.has_role('program_admin') or public.has_role('super_admin'));

create table public.legacy_claim_tokens(
 id uuid primary key default gen_random_uuid(), legacy_record_id uuid not null references public.legacy_application_records on delete cascade,
 email citext not null, token_hash text not null unique, expires_at timestamptz not null, sent_at timestamptz, claimed_at timestamptz,cancelled_at timestamptz,
 created_by uuid references public.profiles, created_at timestamptz not null default now()
);
alter table public.legacy_claim_tokens enable row level security;
create policy "legacy_tokens_staff" on public.legacy_claim_tokens for all to authenticated using(public.has_role('program_admin') or public.has_role('super_admin')) with check(public.has_role('program_admin') or public.has_role('super_admin'));

create or replace function public.claim_legacy_application(p_token text)
returns uuid language plpgsql security definer set search_path=public as $$
declare caller uuid:=auth.uid(); caller_email citext; token_row public.legacy_claim_tokens; record_row public.legacy_application_records; cycle_row public.program_cycles; form_id uuid; new_application uuid; existing_owner uuid; prior_status public.application_status;
begin
 if caller is null then raise exception 'Please sign in to claim your application.'; end if;
 select email into caller_email from auth.users where id=caller;
 select * into token_row from public.legacy_claim_tokens where token_hash=encode(digest(p_token,'sha256'),'hex') and claimed_at is null and cancelled_at is null and expires_at>now() for update;
 if token_row.id is null then raise exception 'This invitation is invalid or expired.'; end if;
 if lower(token_row.email::text)<>lower(caller_email::text) then raise exception 'Sign in with the email address that received this invitation.'; end if;
 select * into record_row from public.legacy_application_records where id=token_row.legacy_record_id for update;
 if record_row.status='claimed' then return record_row.application_id; end if;
 select c.* into cycle_row from public.program_cycles c join public.programs p on p.id=c.program_id where p.slug='name-your-need' and c.name='2026';
 select id into form_id from public.form_versions where cycle_id=cycle_row.id and published_at is not null order by version desc limit 1;
 if cycle_row.id is null or form_id is null then raise exception 'The 2026 Name Your Need application is not configured.'; end if;
 select id,applicant_id,status into new_application,existing_owner,prior_status from public.applications where source_system=record_row.source_system and source_record_id=record_row.source_record_id for update;
 if new_application is not null and existing_owner<>caller then raise exception 'This legacy application is already connected to another account.'; end if;
 if new_application is null then select id,status into new_application,prior_status from public.applications where cycle_id=cycle_row.id and applicant_id=caller for update; end if;
 if new_application is null then
   insert into public.applications(applicant_id,cycle_id,form_version_id,status,source_system,source_record_id,original_submitted_at,submitted_at)
   values(caller,cycle_row.id,form_id,'applied',record_row.source_system,record_row.source_record_id,record_row.original_submitted_at,record_row.original_submitted_at)
   returning id into new_application;
   prior_status:=null;
 else
   update public.applications set source_system=coalesce(source_system,record_row.source_system),source_record_id=coalesce(source_record_id,record_row.source_record_id),original_submitted_at=coalesce(original_submitted_at,record_row.original_submitted_at),submitted_at=coalesce(submitted_at,record_row.original_submitted_at),status=case when status='draft' then 'applied'::public.application_status else status end,updated_at=now() where id=new_application;
 end if;
 insert into public.application_answers(application_id,question_key,value) select new_application,key,to_jsonb(value) from jsonb_each_text(record_row.normalized_data) on conflict(application_id,question_key) do nothing;
 update public.legacy_application_records set status='claimed',claimed_by=caller,application_id=new_application,updated_at=now() where id=record_row.id;
 update public.legacy_claim_tokens set claimed_at=now() where id=token_row.id;
 insert into public.status_history(application_id,previous_status,new_status,actor_id,reason,applicant_note) values(new_application,prior_status,case when prior_status is null or prior_status='draft' then 'applied'::public.application_status else prior_status end,caller,'Legacy application securely claimed.','Your existing Name Your Need application is now connected to your portal account.');
 insert into public.audit_events(actor_id,action,target_type,target_id) values(caller,'legacy_application_claimed','application',new_application::text);
 return new_application;
end $$;
revoke all on function public.claim_legacy_application(text) from public;
grant execute on function public.claim_legacy_application(text) to authenticated;
