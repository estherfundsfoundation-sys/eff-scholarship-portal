# EFF ApplyAll build status

## Implemented

- Branded `/apply-everywhere` demonstration with school selection, calculated question compression, typed interview, Future Passport behavior, application build results, action center, batch review, authorization, Submit All, receipts, and FAFSA/scholarship transition.
- Three fictional Florida, Georgia, and Alabama manifests.
- Deterministic domain engine for preflight, tasks, snapshot hashes, authorization invalidation, and idempotent mock receipts.
- Application-driver contract and approved-origin guard.
- Supabase foundation migration with separate ApplyAll data, RLS, route governance, feature flags, snapshots, batches, and receipts.
- Unit and Playwright demonstration tests.

## Not yet implemented

- Production account onboarding and database-backed autosave.
- Background browser worker and persistent queue.
- Staff Application Atlas UI, parent UI, navigator UI, file storage/scanning, route-change monitor, production observability, and real university routes.
- Any live build or live submission. All live flags are disabled.
