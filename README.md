# Esther Funds Foundation Scholarship Portal

Production portal for EFF-administered scholarships and grants, secure legacy applicant claiming, staff review/award operations, and an automatically refreshed directory of independent scholarships.

- Production: [he-flame.vercel.app](https://he-flame.vercel.app)
- Foundation: [estherfundsfoundation.org](https://www.estherfundsfoundation.org)
Support: `nationals@estherfundsinc.org`

## Stack

- Next.js 15 App Router, React 19, and TypeScript
- Supabase Postgres, Auth, private Storage, RLS, Vault, and `pg_cron`
- Resend transactional email
- Vercel production hosting
- Vitest, ESLint, and TypeScript checks

## Local setup

1. Install Node.js 20 or newer and pnpm.
2. Copy `.env.example` to `.env.local`; never commit the local file.
3. Run `pnpm install`, then `pnpm dev`.
4. Open `http://localhost:3000`.

Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before release.

## Production architecture

All private reads are protected by Supabase RLS and server authorization. Application documents live in the private `application-documents` bucket and staff receive five-minute signed URLs. Applicants can only read their own profiles, applications, answers, documents, requests, decisions, awards, notifications, bookmarks, reminders, and reports. Reviewer notes and decision reasons remain staff-only.

The designated foundation address `nationals@estherfundsinc.org` automatically receives `super_admin` after its verified Auth account exists. Additional staff use individual accounts and are invited from **Admin → Staff and reviewers**. Never share credentials. Enable MFA for every privileged account in Supabase Auth.

## Database and deployment

The `supabase/migrations` directory is authoritative. Link the project, inspect migration parity, then apply pending migrations:

```powershell
pnpm dlx supabase@2.109.1 migration list --linked
pnpm dlx supabase@2.109.1 db push --linked --include-all
pnpm dlx supabase@2.109.1 db lint --linked --level error
```

Deploy with the linked Vercel project:

```powershell
pnpm dlx vercel@55.0.0 --prod
```

After deployment, verify `/`, `/programs/name-your-need`, `/scholarships`, and `/api/health`. The scholarship importer is protected by `CRON_SECRET`. Email delivery is paced by a Supabase `pg_cron` job every five minutes; Vercel Hobby’s daily cron remains sufficient for directory refreshes.

## Name Your Need 2026

The official cycle closes July 31, 2026 at 11:59 p.m. Eastern. Eligibility, required answers/documents, policy acceptance, submission, status tracking, information responses, decision messaging, and award acceptance are enforced in the database. Award amounts and payment commitments are entered only by authorized EFF staff.

Legacy applicant operations are documented in [docs/legacy-import.md](docs/legacy-import.md). Production operations, email, backups, and incident procedures are in [docs/operations.md](docs/operations.md). Security boundaries and role definitions are in [docs/security.md](docs/security.md).

## External directory

Each source has its own parser/adapter. Valid records publish automatically; suspicious or malformed records enter `scholarship_exceptions`. Canonical URLs and normalized titles prevent routine duplicates. Expired fixed-deadline records archive after the configured grace period and are not deleted. Source observations and field-change history remain auditable. Applicants can save listings, schedule reminders, and report problems.

Source fetching uses a descriptive user agent, low frequency, timeouts, run locks, failure backoff, and automatic pause after repeated structural failures. Add or change adapters in `src/lib/importers/adapters.ts`, update fixtures/tests, increment the parser version, and test before production deployment.

## Configuration boundaries

EFF must explicitly approve program eligibility, legal terms, deadlines, award amounts, payment/disbursement authorization, retention schedules, source permission dates/notes, and any new demographic questions. The portal does not move money or store banking/card data.
