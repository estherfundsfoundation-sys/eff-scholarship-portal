# Legacy Name Your Need import and invitations

## Source file and dry run

Use `scripts/import_legacy_applicants.py`. The importer hashes the workbook, normalizes configured fields, validates email addresses, detects duplicate emails/source IDs, and reports reconciliation counts without printing applicant PII.

Always run the dry run first:

```powershell
python scripts/import_legacy_applicants.py path\to\applicants.xlsx --dry-run
```

The production endpoint requires `LEGACY_IMPORT_SECRET`. Imports are idempotent by file hash, source record ID, job row number, cycle/applicant uniqueness, and legacy-record identity. Raw rows remain restricted in `import_rows`; committed records preserve source ID, source system, original timestamp, normalized fields, and import job.

## Reconciliation gate

Before invitations, record and verify:

- workbook row count;
- valid and invalid email counts;
- unique and duplicate counts;
- committed, excluded, and error totals;
- re-run result (must create no duplicates).

Production’s supplied workbook contains 2,314 rows, 2,214 unique applicant emails, and 100 duplicate rows. Invitations must remain paused until the full portal launch audit passes.

## Invitation and claim flow

From **Admin → Legacy applicant import**, an authorized administrator can queue a paced batch. The database excludes suppressed, invalid/duplicate, already invited, and claimed records. Each eligible record gets one random 256-bit, 14-day, single-use token; only its SHA-256 hash is stored. Resend receives no essays, answers, or documents.

The recipient must sign in with the exact verified email. Existing accounts attach safely without creating another profile. A successful claim rotates ownership, preserves newer portal data, records audit events, and invalidates the token. Expired, cancelled, reused, or wrong-email tokens fail.

Send a single staff test first. Confirm delivery, link opening, account creation/sign-in, exact-email enforcement, application attachment, and replay failure before queuing the full audience. Monitor queued, processing, sent, failed, claimed, and expired totals.

## Suppression and recovery

Add known bounces, complaints, or opt-outs to `email_suppressions` before a batch. Delivery retries use exponential backoff and stop after eight attempts. Never copy tokens from logs, expose raw rows, or email application content. If a batch must stop, disable the scheduler, cancel outstanding tokens, preserve the audit trail, and investigate before resuming.
