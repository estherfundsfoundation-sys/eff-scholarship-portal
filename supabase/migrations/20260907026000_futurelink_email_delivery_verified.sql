-- Deployment guard: the controlled FutureLink launch email must have been
-- accepted by the configured email provider before launch is considered ready.
do $$
begin
  if not exists (
    select 1
    from public.messages
    where idempotency_key = 'futurelink-launch-email-smoke-20260906'
      and status = 'sent'
      and sent_at is not null
      and provider_id is not null
  ) then
    raise exception 'FutureLink delivery smoke test has not been sent by the provider';
  end if;
end
$$;
