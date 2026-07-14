# Security and role boundaries

## Roles

- `applicant`: own profile/applications/documents/requests/decisions/awards/bookmarks/reminders only.
- `reviewer`: assigned applications and rubrics; no award, role, import, or payment authority.
- `finance`: award/disbursement records only where policy permits.
- `program_admin`: application operations, reviewer assignment, decisions, awards, imports, and sources.
- `super_admin`: program administration plus staff-role grants, suppressions, audit, and system configuration.

Roles are database-enforced. Users cannot promote themselves. Staff invitations and role grants use individual Auth accounts and append an audit event. Program-level scoping is supported in `user_roles.program_id`; expand UI scoping before multiple independent program teams are added.

## Data protections

- RLS is enabled on private tables.
- Service credentials are imported only in server-only modules.
- Uploads accept PDF/JPG/PNG/WebP, enforce a 10 MB application limit, use random object names, and remain in a private bucket.
- Staff document links expire after five minutes.
- Claim tokens are random, hashed, expiring, single-use, exact-email bound, and rotated on resend.
- Server actions validate ownership/roles again through RLS or security-definer functions.
- Redirects accept only internal paths; external scholarship links use `noopener noreferrer`.
- Email and import queues use unique idempotency keys and retry-safe locking.
- Audit metadata excludes passwords, secrets, tokens, raw documents, and essays.

## Capacity and abuse controls

The database uses indexed status/cycle/queue queries, pagination, batch limits, and lock-safe workers suitable for tens of thousands of applicants. Supabase/Vercel plan limits, Auth email limits, Resend throughput, storage, backup retention, and database compute still require monitoring and scaling before a high-volume campaign. Enable CAPTCHA and tune Auth rate limits; do not weaken account verification to solve rate-limit pressure.

## Retention and legal approval

EFF must approve a written retention/deletion schedule, accommodation-data handling, privacy notice, award agreement, and incident-notification procedure. Until then, records soft-archive rather than auto-delete, and banking/card data must not be collected.
