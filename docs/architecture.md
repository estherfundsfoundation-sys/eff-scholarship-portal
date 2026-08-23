# EFF ApplyAll architecture

The portal remains a Next.js App Router application. `/apply-everywhere` contains the isolated product UI. `src/lib/applyall` contains configuration, domain types, manifests, deterministic compilation, snapshot hashing, authorization validation, idempotent mock submission, and the driver contract. Supabase stores separate ApplyAll profiles, Future Passport answers, routes, tasks, applications, immutable snapshots, batches, receipts, permissions, and audits.

Browser execution is deliberately outside request handlers. Future workers implement the driver contract with isolated Playwright contexts, domain allowlists, short-lived sessions, redacted traces, idempotency keys, and cleanup. Only mock execution is enabled by default.
