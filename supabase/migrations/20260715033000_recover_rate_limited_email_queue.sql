-- Rate-limit responses are temporary. Resume messages that the older worker
-- labeled as provider failures, and recover any claims abandoned mid-request.
update public.messages
set status = 'queued',
    next_attempt_at = now(),
    last_error_safe = null
where status = 'queued'
  and last_error_safe in (
    'Email provider rejected this delivery attempt.',
    'Email delivery is briefly paced and will retry automatically.'
  );

update public.messages
set status = 'queued',
    next_attempt_at = now(),
    last_error_safe = 'A previous delivery attempt was interrupted and will retry automatically.'
where status = 'processing'
  and next_attempt_at < now() - interval '15 minutes';
