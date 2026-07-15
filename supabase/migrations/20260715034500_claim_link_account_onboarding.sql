-- Server-only lookup used to let a valid private claim invitation replace a
-- second email-verification round during high-volume legacy onboarding.
create or replace function public.legacy_claim_invitation_email(p_token text)
returns citext
language sql
stable
security definer
set search_path=public,extensions
as $$
  select email
  from public.legacy_claim_tokens
  where token_hash=encode(digest(p_token,'sha256'),'hex')
    and claimed_at is null
    and cancelled_at is null
    and expires_at>now()
  limit 1
$$;

revoke all on function public.legacy_claim_invitation_email(text) from public,anon,authenticated;
grant execute on function public.legacy_claim_invitation_email(text) to service_role;
