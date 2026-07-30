do $$
declare
  ambassador_record_id uuid;
  portal_user_id uuid;
begin
  select id
  into portal_user_id
  from public.profiles
  where primary_email = 'brooksiyanna@yahoo.com';

  if portal_user_id is null then
    raise exception 'Verified portal account was not found for Iyanna Brooks.';
  end if;

  select id
  into ambassador_record_id
  from public.reach_ambassadors
  where email = 'iyanna.brooks@bulldogs.aamu.edu'
    and active = true;

  if ambassador_record_id is null then
    raise exception 'Active REACH Ambassador record was not found for Iyanna Brooks.';
  end if;

  if exists (
    select 1
    from public.reach_ambassadors
    where user_id = portal_user_id
      and id <> ambassador_record_id
  ) then
    raise exception 'The verified portal account is already connected to another REACH Ambassador record.';
  end if;

  update public.reach_ambassadors
  set
    user_id = portal_user_id,
    login_email = 'brooksiyanna@yahoo.com',
    claimed_at = coalesce(claimed_at, now()),
    claim_token_hash = null,
    claim_token_expires_at = null,
    updated_at = now()
  where id = ambassador_record_id
    and (user_id is null or user_id = portal_user_id);

  if not found then
    raise exception 'The REACH Ambassador record is connected to a different portal account.';
  end if;

  insert into public.audit_events (
    actor_id,
    action,
    target_type,
    target_id,
    metadata_safe
  )
  values (
    null,
    'reach_ambassador_account_connected_by_support',
    'reach_ambassador',
    ambassador_record_id::text,
    jsonb_build_object(
      'invitation_email_domain', 'bulldogs.aamu.edu',
      'login_email_domain', 'yahoo.com',
      'reason', 'school inbox did not deliver secure claim email'
    )
  );
end
$$;
