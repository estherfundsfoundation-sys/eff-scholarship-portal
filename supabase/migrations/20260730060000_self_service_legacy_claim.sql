-- Let a signed-in applicant securely request a fresh invitation for only the
-- unclaimed imported application matching the authenticated email address.
create or replace function public.request_my_legacy_claim_invitation(p_site_url text)
returns text
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  actor uuid:=auth.uid();
  caller_email citext;
  record_row public.legacy_application_records;
  raw_token text;
  token_id uuid;
begin
  if actor is null then
    raise exception 'Please sign in again.';
  end if;

  select email::citext into caller_email from auth.users where id=actor;
  if caller_email is null then
    raise exception 'Your signed-in email could not be verified.';
  end if;

  select *
  into record_row
  from public.legacy_application_records
  where lower(email::text)=lower(caller_email::text)
    and status not in ('excluded','error')
  order by original_submitted_at desc nulls last,created_at desc
  limit 1
  for update;

  if record_row.id is null then
    return 'not_found';
  end if;

  if record_row.claimed_by=actor and record_row.application_id is not null then
    return 'already_connected';
  end if;

  if record_row.claimed_by is not null and record_row.claimed_by<>actor then
    return 'staff_review';
  end if;

  if exists(
    select 1
    from public.messages
    where lower(recipient::text)=lower(caller_email::text)
      and template_key='legacy_claim'
      and created_at>now()-interval '10 minutes'
      and status in ('queued','processing','sent')
  ) then
    return 'recently_sent';
  end if;

  update public.legacy_claim_tokens
  set cancelled_at=now()
  where legacy_record_id=record_row.id
    and claimed_at is null
    and cancelled_at is null;

  raw_token:=encode(extensions.gen_random_bytes(32),'hex');
  insert into public.legacy_claim_tokens
    (legacy_record_id,email,token_hash,expires_at,created_by)
  values
    (record_row.id,record_row.email,encode(extensions.digest(raw_token,'sha256'),'hex'),now()+interval '14 days',actor)
  returning id into token_id;

  insert into public.messages
    (recipient,idempotency_key,legacy_token_id,status,payload_private,template_key,next_attempt_at)
  values
    (
      record_row.email,
      'legacy-self-service:'||record_row.id::text||':'||token_id::text,
      token_id,
      'queued',
      jsonb_build_object(
        'name',coalesce(record_row.normalized_data->>'preferred_name',record_row.normalized_data->>'legal_name','Applicant'),
        'claim_url',rtrim(p_site_url,'/')||'/claim/'||raw_token
      ),
      'legacy_claim',
      now()
    );

  update public.legacy_application_records
  set status='invited',updated_at=now()
  where id=record_row.id;

  insert into public.application_history_events
    (application_id,legacy_record_id,event_type,actor_id,details_safe)
  values
    (
      record_row.application_id,
      record_row.id,
      'self_service_invitation_requested',
      actor,
      jsonb_build_object('expires_at',now()+interval '14 days')
    );

  insert into public.audit_events
    (actor_id,action,target_type,target_id,metadata_safe)
  values
    (
      actor,
      'legacy_claim_self_service_requested',
      'legacy_application',
      record_row.id::text,
      jsonb_build_object('token_id',token_id)
    );

  return 'queued';
end
$$;

revoke all on function public.request_my_legacy_claim_invitation(text) from public,anon;
grant execute on function public.request_my_legacy_claim_invitation(text) to authenticated;
