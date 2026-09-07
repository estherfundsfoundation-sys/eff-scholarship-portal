-- One controlled delivery to the National Office verifies the production email
-- provider without contacting any participant.
insert into public.messages(recipient,idempotency_key,status,template_key,payload_private,next_attempt_at)
values(
  'nationals@estherfundsinc.org',
  'futurelink-launch-email-smoke-20260906',
  'queued',
  'futurelink_delivery_test',
  jsonb_build_object('name','Shayna','application_path','/future-link/dashboard'),
  now()
)
on conflict(idempotency_key) do nothing;
