-- Launch gate: both requested National Office canary emails must be accepted by
-- the configured provider before the FutureLink promotion is cleared.
do $$
begin
  if (select count(*) from public.messages
      where idempotency_key in (
        'futurelink-prelaunch-onboarding-20260907',
        'futurelink-prelaunch-match-20260907'
      )
        and status='sent'
        and sent_at is not null
        and provider_id is not null) <> 2 then
    raise exception 'FutureLink prelaunch email canaries have not both been sent';
  end if;
end
$$;
