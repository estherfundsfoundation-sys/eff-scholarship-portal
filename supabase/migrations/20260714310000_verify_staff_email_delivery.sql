do $$
declare delivery_status text; attempts_count int; provider text;
begin
  select status,attempts,provider_id into delivery_status,attempts_count,provider from public.messages where idempotency_key='launch-email-test:2026-07-14';
  if delivery_status is null then raise exception 'Launch gate: staff email test record is missing.';end if;
  if delivery_status<>'sent' or provider is null then raise exception 'Launch gate: staff email test is %, attempts %; expected sent with a provider ID.',delivery_status,attempts_count;end if;
end $$;
