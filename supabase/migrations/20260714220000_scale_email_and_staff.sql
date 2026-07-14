-- Production-scale account, invitation, and query safeguards.
alter table public.organizations enable row level security;
alter table public.policy_acceptances enable row level security;
alter table public.rubrics enable row level security;
alter table public.import_jobs enable row level security;
alter table public.import_rows enable row level security;
alter table public.claim_invitations enable row level security;
alter table public.email_templates enable row level security;
alter table public.external_sources enable row level security;
alter table public.source_observations enable row level security;
alter table public.importer_runs enable row level security;
alter table public.scholarship_exceptions enable row level security;

create policy "organizations_staff_read" on public.organizations for select to authenticated using(public.has_role('program_admin') or public.has_role('super_admin'));
create policy "acceptances_staff_read" on public.policy_acceptances for select to authenticated using(public.has_role('program_admin') or public.has_role('super_admin'));
create policy "rubrics_review_staff_read" on public.rubrics for select to authenticated using(public.has_role('reviewer') or public.has_role('program_admin') or public.has_role('super_admin'));
create policy "import_jobs_admin_read" on public.import_jobs for select to authenticated using(public.has_role('program_admin') or public.has_role('super_admin'));
create policy "import_rows_admin_read" on public.import_rows for select to authenticated using(public.has_role('program_admin') or public.has_role('super_admin'));
create policy "claim_invitations_admin_manage" on public.claim_invitations for all to authenticated using(public.has_role('program_admin') or public.has_role('super_admin')) with check(public.has_role('program_admin') or public.has_role('super_admin'));
create policy "email_templates_admin_read" on public.email_templates for select to authenticated using(public.has_role('program_admin') or public.has_role('super_admin'));
create policy "external_sources_admin_read" on public.external_sources for select to authenticated using(public.has_role('program_admin') or public.has_role('super_admin'));
create policy "source_observations_admin_read" on public.source_observations for select to authenticated using(public.has_role('program_admin') or public.has_role('super_admin'));
create policy "importer_runs_admin_read" on public.importer_runs for select to authenticated using(public.has_role('program_admin') or public.has_role('super_admin'));
create policy "scholarship_exceptions_admin_manage" on public.scholarship_exceptions for all to authenticated using(public.has_role('program_admin') or public.has_role('super_admin')) with check(public.has_role('program_admin') or public.has_role('super_admin'));

alter table public.messages
  add column if not exists legacy_token_id uuid references public.legacy_claim_tokens,
  add column if not exists payload_private jsonb,
  add column if not exists attempts int not null default 0,
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists sent_at timestamptz,
  add column if not exists last_error_safe text;

alter table public.legacy_application_records add column if not exists exclusion_reason text;
create table if not exists public.email_suppressions(
  email citext primary key,
  reason text not null,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);
alter table public.email_suppressions enable row level security;
create policy "email_suppressions_admin_manage" on public.email_suppressions for all to authenticated
using(public.has_role('super_admin')) with check(public.has_role('super_admin'));

alter table public.messages enable row level security;
create policy "messages_staff_read" on public.messages for select to authenticated
using(public.has_role('program_admin') or public.has_role('super_admin'));

create index if not exists messages_delivery_queue_idx on public.messages(status,next_attempt_at,created_at);
create index if not exists applications_cycle_submitted_idx on public.applications(cycle_id,submitted_at desc);
create index if not exists applications_status_submitted_idx on public.applications(status,submitted_at desc);
create index if not exists legacy_records_status_created_idx on public.legacy_application_records(status,created_at,id);
create index if not exists legacy_tokens_record_active_idx on public.legacy_claim_tokens(legacy_record_id,expires_at) where claimed_at is null and cancelled_at is null;
create unique index if not exists one_active_legacy_claim_token_idx on public.legacy_claim_tokens(legacy_record_id) where claimed_at is null and cancelled_at is null;

-- The foundation explicitly designated this address as its initial portal administrator.
insert into public.user_roles(user_id,role,program_id,granted_by)
select p.id,'super_admin',null,null from public.profiles p
where lower(p.primary_email::text)='nationals@estherfundsinc.org'
on conflict do nothing;

create or replace function public.grant_designated_foundation_admin()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if lower(new.primary_email::text)='nationals@estherfundsinc.org' then
    insert into public.user_roles(user_id,role,program_id,granted_by)
    values(new.id,'super_admin',null,null) on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists grant_designated_foundation_admin on public.profiles;
create trigger grant_designated_foundation_admin after insert or update of primary_email on public.profiles
for each row execute procedure public.grant_designated_foundation_admin();

create or replace function public.queue_legacy_claim_invitations(p_limit int,p_site_url text)
returns int language plpgsql security definer set search_path=public,extensions as $$
declare actor uuid:=auth.uid(); item record; raw_token text; token_id uuid; queued_count int:=0;
begin
  if actor is null or not (public.has_role('program_admin') or public.has_role('super_admin')) then raise exception 'Not authorized.'; end if;
  if p_limit<1 or p_limit>5000 then raise exception 'Batch size must be between 1 and 5000.'; end if;
  if p_site_url !~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?$' then raise exception 'A valid HTTPS portal URL is required.'; end if;

  update public.legacy_application_records r set status='excluded',exclusion_reason='Duplicate email within the 2026 legacy import.',updated_at=now()
  where r.status='committed' and exists(
    select 1 from public.legacy_application_records earlier
    where lower(earlier.email::text)=lower(r.email::text)
      and earlier.status in('committed','invited','claimed')
      and (earlier.created_at,earlier.id)<(r.created_at,r.id)
  );

  for item in
    select r.id,r.email,coalesce(nullif(r.normalized_data->>'preferred_name',''),nullif(r.normalized_data->>'legal_name',''),'Applicant') as applicant_name
    from public.legacy_application_records r
    where r.status='committed'
      and not exists(select 1 from public.email_suppressions s where lower(s.email::text)=lower(r.email::text))
      and not exists(select 1 from public.messages m where m.idempotency_key='legacy-claim:'||r.id::text)
    order by r.created_at,r.id limit p_limit for update skip locked
  loop
    raw_token:=encode(gen_random_bytes(32),'hex');
    insert into public.legacy_claim_tokens(legacy_record_id,email,token_hash,expires_at,created_by)
    values(item.id,item.email,encode(digest(raw_token,'sha256'),'hex'),now()+interval '14 days',actor)
    returning id into token_id;
    insert into public.messages(recipient,idempotency_key,legacy_token_id,status,payload_private)
    values(item.email,'legacy-claim:'||item.id::text,token_id,'queued',jsonb_build_object('name',item.applicant_name,'claim_url',rtrim(p_site_url,'/')||'/claim/'||raw_token));
    update public.legacy_application_records set status='invited',updated_at=now() where id=item.id;
    queued_count:=queued_count+1;
  end loop;
  insert into public.audit_events(actor_id,action,target_type,target_id,metadata_safe)
  values(actor,'legacy_invitations_queued','legacy_import','name_your_need_2026',jsonb_build_object('queued',queued_count));
  return queued_count;
end $$;
revoke all on function public.queue_legacy_claim_invitations(int,text) from public;
grant execute on function public.queue_legacy_claim_invitations(int,text) to authenticated;

create or replace function public.dequeue_email_messages(p_limit int default 25)
returns table(message_id uuid,recipient citext,payload_private jsonb,attempts int,legacy_token_id uuid)
language plpgsql security definer set search_path=public as $$
begin
  return query
  with picked as (
    select m.id from public.messages m
    where m.status='queued' and m.next_attempt_at<=now()
    order by m.created_at
    for update skip locked limit least(greatest(p_limit,1),25)
  )
  update public.messages m set status='processing'
  from picked where m.id=picked.id
  returning m.id,m.recipient,m.payload_private,m.attempts,m.legacy_token_id;
end $$;
revoke all on function public.dequeue_email_messages(int) from public,anon,authenticated;
grant execute on function public.dequeue_email_messages(int) to service_role;

insert into public.audit_events(actor_id,action,target_type,target_id,metadata_safe)
values(null,'designated_admin_configured','system','nationals_staff_access',jsonb_build_object('role','super_admin'));
