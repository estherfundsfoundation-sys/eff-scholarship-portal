-- Deliver public-link corrections before the remainder of the onboarding queue.
update public.messages
set created_at = now() - interval '7 days', next_attempt_at = now()
where status = 'queued'
  and idempotency_key like 'legacy-claim-public-link:%';
