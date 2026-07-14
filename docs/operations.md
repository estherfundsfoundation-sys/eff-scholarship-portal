# Production operations runbook

## Environment and domain

Set every `.env.example` value in Vercel Production. Browser-safe Supabase values begin with `NEXT_PUBLIC_`; service role, Resend, cron, and import secrets are server-only. Use separate Preview values. `NEXT_PUBLIC_SITE_URL` must be the canonical HTTPS portal origin.

Authenticate the sending domain in Resend before bulk delivery. Publish the exact SPF/DKIM records Resend provides, verify them, set `EMAIL_FROM` to an approved sender on `estherfundsfoundation.org` or `estherfundsinc.org`, and send one test to `nationals@estherfundsinc.org`. Do not start bulk invitations while the domain is unverified.

In Supabase Auth, set the site URL and allowed redirects to the canonical portal plus `/auth/callback`. Require email confirmation, configure rate limits/CAPTCHA appropriate for the expected 30,000-student load, and require MFA for staff.

## Scheduled work

- External scholarship importer: daily Vercel cron, protected by `CRON_SECRET`.
- Email worker and scholarship reminders: Supabase `pg_cron` every five minutes, authenticated with the same secret stored in Vault.
- Each email worker claim uses `FOR UPDATE SKIP LOCKED`, a maximum of 25 deliveries, retry backoff, and idempotency keys.

Check source health, recent runs, exceptions, student reports, email failures, and application queues each business day during an open cycle.

## Backups and restore

Enable Supabase Pro point-in-time recovery or daily backups. Keep encrypted exports only in approved EFF storage with least-privilege access. Quarterly, restore to an isolated project and verify profiles, applications, answers, private-object metadata, status history, decisions, awards, imports, messages, directory records, and audit events. Record the restore date, operator, duration, and result.

## Release checklist

1. Migration list matches local and remote; database lint returns no schema errors.
2. Lint, typecheck, tests, and production build pass.
3. Public pages and `/api/health` return 200; cron endpoints return 401 without a secret.
4. A fresh test applicant can verify email, complete profile, save, upload, submit, view status, answer a request, read a decision, and accept a test award.
5. A reviewer sees only assigned work, discloses conflict status, submits/locks a rubric, and cannot edit it afterward.
6. An administrator can search, transition, request information, decide, issue an award, export, manage staff, and see audit history.
7. Legacy dry run/re-import/claim/replay tests pass; then send one staff invitation test.
8. Both primary source adapters complete, a duplicate merges, an expired record archives, and an invalid item enters exceptions.

## Incident recovery

For suspected exposure or abuse: pause email/import schedules, disable the affected integration, rotate the narrowest relevant secret, revoke sessions/tokens as needed, preserve audit and provider evidence, determine affected records, restore only if integrity requires it, and follow EFF’s approved breach-notification policy and applicable law. Never delete audit events to hide an incident.

For a source parser failure: leave historical listings intact, pause the source after repeated failures, inspect only safe error details, update its adapter and fixtures, increment the parser version, test, deploy, then run a manual retry.

For email bounce/complaint spikes: pause the queue, add suppressions, confirm domain reputation and content, and resume with a small monitored batch.
