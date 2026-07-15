-- Repair legacy invitations that were queued with a protected deployment hostname.
-- Unsent messages are corrected in place; already-sent messages receive one
-- idempotent correction using the same still-valid single-use claim token.

update public.messages
set payload_private = jsonb_set(
  payload_private,
  '{claim_url}',
  to_jsonb(regexp_replace(payload_private->>'claim_url', '^https://[^/]+', 'https://he-flame.vercel.app'))
),
status = case when status = 'processing' then 'queued' else status end,
next_attempt_at = now()
where template_key = 'legacy_claim'
  and status in ('queued','processing')
  and payload_private ? 'claim_url'
  and payload_private->>'claim_url' not like 'https://he-flame.vercel.app/%';

do $$
declare item record; raw_token text; new_token_id uuid;
begin
  for item in
    select m.recipient,m.legacy_token_id,t.legacy_record_id,t.created_by,
      coalesce(nullif(r.normalized_data->>'preferred_name',''),nullif(r.normalized_data->>'legal_name',''),'Applicant') as applicant_name
    from public.messages m
    join public.legacy_claim_tokens t on t.id=m.legacy_token_id
    join public.legacy_application_records r on r.id=t.legacy_record_id
    where m.template_key='legacy_claim' and m.status='sent'
      and not exists(
        select 1 from public.messages correction
        where correction.idempotency_key='legacy-claim-public-link:'||t.legacy_record_id::text
      )
  loop
    update public.legacy_claim_tokens set cancelled_at=now() where id=item.legacy_token_id and claimed_at is null;
    raw_token:=encode(extensions.gen_random_bytes(32),'hex');
    insert into public.legacy_claim_tokens(legacy_record_id,email,token_hash,expires_at,created_by)
    values(item.legacy_record_id,item.recipient,encode(extensions.digest(raw_token,'sha256'),'hex'),now()+interval '14 days',item.created_by)
    returning id into new_token_id;
    insert into public.messages(recipient,idempotency_key,legacy_token_id,status,payload_private,template_key,next_attempt_at)
    values(item.recipient,'legacy-claim-public-link:'||item.legacy_record_id::text,new_token_id,'queued',
      jsonb_build_object('name',item.applicant_name,'claim_url','https://he-flame.vercel.app/claim/'||raw_token),
      'legacy_claim',now());
  end loop;
end $$;
