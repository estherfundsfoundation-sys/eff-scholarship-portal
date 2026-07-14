# EFF Scholarship Portal

A mobile-first portal for Esther Funds Foundation-administered programs and a separate trusted external scholarship directory. Built with Next.js, TypeScript, Supabase, Resend, and Vercel Cron.

## Local setup

1. Install Node.js 20+ and run `pnpm install`.
2. Copy `.env.example` to `.env.local` and add development credentials.
3. Create a Supabase project, run `supabase/migrations/0001_portal_core.sql`, then configure a private documents bucket.
4. Run `pnpm dev` and open `http://localhost:3000`.

## Initial administrator

Shayna Vincent first registers normally and verifies her email. In the Supabase SQL editor, use the commented statement in `supabase/seed.sql` with her Auth user UUID. Never expose the service-role key or allow client-side role writes. Require MFA for this account in Supabase Auth settings before production launch.

## Environment and integrations

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are browser-safe project identifiers.
- `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, and `CRON_SECRET` are server-only Vercel secrets.
- Authenticate the sending domain in Resend and set `EMAIL_FROM` only after its DNS records pass.
- Set `NEXT_PUBLIC_APP_URL` to the canonical production URL. Use cryptographically random values for cron and claim secrets.

## Deployment

1. Create a GitHub repository and push this project without any `.env` files.
2. Import the repository into Vercel as a Next.js project.
3. Add every production variable from `.env.example` in Vercel; use separate Preview values.
4. Deploy, verify `/api/health`, then confirm the daily cron appears in Vercel settings.
5. Configure the custom domain, add the Resend DNS records, and update Supabase Auth site/redirect URLs.
6. Apply migrations to production, create the documents bucket, register Shayna, grant `super_admin`, enable MFA, and run a non-financial end-to-end test.

## Legacy import and claim policy

CSV imports are staged as immutable raw rows, mapped, validated, and dry-run before commit. A file hash and source IDs make commits idempotent. Claim invitations must store only a SHA-256 token hash, rotate on resend, expire promptly, verify email ownership, and attach an application only after authentication. Never include answers or documents in email.

Suggested CSV fields: `original_submission_id`, `legal_name`, `email`, `phone`, `school`, `submitted_at`, `current_status`, plus answer and document URL columns. Administrators map source headers during dry run rather than relying on fixed names.

## Importer operations

Each trusted website has an independent adapter and fixture tests. The daily endpoint is protected by `CRON_SECRET`; production workers should use a run-level lock, respectful user agent, backoff, failure threshold, and source-configured frequency. Normal validated records auto-publish; suspicious or incomplete records enter exceptions. Bot challenges and transient failures do not mean removal.

Written permission is represented in seeded source records, but the actual permission date and notes must be entered by an administrator before launch. Parser changes require a version bump and fixture update. Keep requests infrequent and never copy branding or long-form content.

## Security, storage, recovery, and exports

RLS is the primary data boundary; server authorization remains mandatory. Documents belong in a private bucket with short-lived signed URLs and content-type/size validation. Keep reviewer notes in the separately protected table. Log decisions, role changes, exports, imports, claims, and source changes without secrets or document content.

Enable Supabase point-in-time recovery or daily backups before launch. Test restore procedures quarterly. In an incident, rotate affected secrets, pause imports/email, preserve audit records, restore if needed, and notify affected parties according to EFF policy and applicable law. Exports are permission-scoped, omit restricted fields by default, and create an audit event.

## Intentionally configuration-dependent

Award values, eligibility, deadlines, legal terms, disbursement authorization, demographic questions, retention rules, grace periods, reminder timing, source permission dates, and public domain/email identity are not invented in code. They must be approved and configured by EFF before a cycle opens.
