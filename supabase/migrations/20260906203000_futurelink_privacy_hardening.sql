-- Only non-sensitive agreement metadata is visible to the two participants.
revoke select on public.futurelink_agreements from authenticated;
grant select(id,match_id,user_id,agreement_version,signed_at) on public.futurelink_agreements to authenticated;

-- Verification pages are served through a narrowly scoped server route. Do not
-- expose the underlying mentor UUID or ledger row for public enumeration.
drop policy if exists "futurelink public verification read" on public.futurelink_service_verifications;
revoke select on public.futurelink_service_verifications from anon;
