-- Resume messages that were safely deferred while the Resend daily quota was exhausted.
update public.messages
set next_attempt_at = now(), last_error_safe = null
where status = 'queued'
  and last_error_safe = 'Email service quota reached; delivery is safely paused and will retry.';
