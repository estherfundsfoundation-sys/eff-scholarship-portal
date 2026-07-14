-- Supabase installs pgcrypto in the extensions schema; keep token operations explicit and retry-safe.
alter function public.claim_legacy_application(text) set search_path=public,extensions;
alter function public.queue_legacy_claim_invitations(int,text) set search_path=public,extensions;
