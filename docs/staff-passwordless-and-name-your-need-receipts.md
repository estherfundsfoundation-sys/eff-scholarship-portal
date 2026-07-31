# Staff passwordless access and Name Your Need receipts

## Release order

1. Apply `supabase/migrations/20260731120000_staff_passwordless_and_name_your_need_receipts.sql`.
2. Configure and verify the production environment variables listed below.
3. Deploy the application.
4. Sign in at `/admin/sign-in` with an active staff account and verify the one-time-code flow.
5. Review the read-only Name Your Need recipient metrics at `/admin/communications`.
6. Do not queue the receipt campaign until an authorized EFF administrator has approved the displayed recipient count.

The migration configures the receipt campaign but does **not** queue or send the batch.

## Required environment variables

The deployment continues to require the repository's existing Supabase and Resend variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `CRON_SECRET`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_APP_URL`

Add:

- `STAFF_LOGIN_AUDIT_SECRET`: a random value of at least 32 characters, used only to HMAC staff-login email/IP audit fingerprints. This must not be a Supabase, Resend, or user password secret.

Never place service-role, Resend, OTP, or audit-secret values in a client-exposed variable.

## Database changes

The migration:

- adds `active` and `revoked_at` to `user_roles`;
- changes `has_role` so inactive roles cannot authorize staff access;
- creates a private, hash-only staff login request ledger and a rate-limit RPC;
- creates the versioned Name Your Need receipt template;
- creates a security-invoker candidate view plus metrics, queue, and failed-message retry RPCs;
- grants active reviewers access to private application documents through short-lived signed URLs;
- prevents assignment of drafts or inactive reviewers;
- requires every rubric criterion to have a whole-number score from 1 through 5 before a review can be locked;
- records all material actions in `audit_events`.

## Receipt eligibility and idempotency

A recipient is eligible only when:

- the application belongs to the `name-your-need` program's `2026` cycle;
- its state is submitted (`applied`) or has a valid past submitted timestamp in a submitted workflow state;
- its normalized address is valid and is not a test or no-reply address;
- its address is not in `email_suppressions`; and
- no message already exists with the campaign's normalized-email idempotency key.

Duplicate applications sharing one normalized email produce one receipt. Delivery is performed by the existing `messages` queue worker, not by a browser loop.

## Approval and operation

At `/admin/communications`, a program administrator or super administrator can see:

- unique recipients;
- currently eligible recipients;
- queued, processing, failed, and sent totals;
- suppression, invalid-address, and duplicate exclusions.

After the recipient count is approved, a super administrator can type `QUEUE NAME YOUR NEED RECEIPTS` to create the queue entries. The unique idempotency key makes repeated queue requests safe. Failed entries can be retried with `RETRY FAILED RECEIPTS`; suppressed recipients are excluded again at retry time.

The existing email cron endpoint processes the queue and records provider acceptance, failures, attempts, safe error details, and final message status.

## Read-only production preview

Before migration or queuing, an authorized operator can calculate counts without writing or sending:

```powershell
node --env-file=.env.production.local tools/preview_name_your_need_receipts.mjs
```

The script prints aggregate counts only and does not emit applicant names or email addresses.
