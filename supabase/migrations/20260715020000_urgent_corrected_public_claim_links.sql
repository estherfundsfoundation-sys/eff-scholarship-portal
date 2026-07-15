-- Make the correction unmistakable and issue a fresh public-domain claim link
-- to every recipient affected by the original protected Vercel hostname.

insert into public.email_templates(program_id,event_key,subject,body,version)
select null,'legacy_claim_correction','CORRECTED PUBLIC LINK — Ignore earlier EFF portal emails',
'<p>Hello {{name}},</p><p><strong>Please ignore every earlier EFF portal invitation.</strong> Those messages may open a private Vercel access screen.</p><p><a href="{{claim_url}}">Use this corrected public link to claim your existing application</a>.</p><p>This is a new single-use link on <strong>portal.estherfundsfoundation.org</strong>. You do not need, and should not request, Vercel access.</p>',1
where not exists(
  select 1 from public.email_templates
  where program_id is null and event_key='legacy_claim_correction' and version=1
);

do $$
declare item record; raw_token text; new_token_id uuid;
begin
  for item in
    select distinct on (t.legacy_record_id)
      t.legacy_record_id,t.id as token_id,t.email,t.created_by,
      coalesce(nullif(r.normalized_data->>'preferred_name',''),nullif(r.normalized_data->>'legal_name',''),'Applicant') as applicant_name
    from public.messages m
    join public.legacy_claim_tokens t on t.id=m.legacy_token_id
    join public.legacy_application_records r on r.id=t.legacy_record_id
    where m.idempotency_key like 'legacy-claim-public-link:%'
      and t.claimed_at is null
      and not exists(
        select 1 from public.messages urgent
        where urgent.idempotency_key='legacy-claim-urgent-correction:'||t.legacy_record_id::text
      )
    order by t.legacy_record_id,m.created_at desc
  loop
    update public.legacy_claim_tokens
      set cancelled_at=now()
      where legacy_record_id=item.legacy_record_id and claimed_at is null and cancelled_at is null;
    raw_token:=encode(extensions.gen_random_bytes(32),'hex');
    insert into public.legacy_claim_tokens(legacy_record_id,email,token_hash,expires_at,created_by)
    values(item.legacy_record_id,item.email,encode(extensions.digest(raw_token,'sha256'),'hex'),now()+interval '14 days',item.created_by)
    returning id into new_token_id;
    insert into public.messages(recipient,idempotency_key,legacy_token_id,status,payload_private,template_key,next_attempt_at,created_at)
    values(item.email,'legacy-claim-urgent-correction:'||item.legacy_record_id::text,new_token_id,'queued',
      jsonb_build_object('name',item.applicant_name,'claim_url','https://portal.estherfundsfoundation.org/claim/'||raw_token),
      'legacy_claim_correction',now(),now()-interval '14 days');
  end loop;
end $$;

update public.messages
set payload_private=jsonb_set(
  payload_private,'{claim_url}',
  to_jsonb(regexp_replace(payload_private->>'claim_url','^https://[^/]+','https://portal.estherfundsfoundation.org'))
)
where template_key='legacy_claim' and status='queued'
  and payload_private ? 'claim_url';
