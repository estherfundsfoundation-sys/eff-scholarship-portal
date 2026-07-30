# EFF Tech Desk: Architecture, Safety, and Operations

Last updated: July 30, 2026

## Purpose

The EFF Tech Desk is a separate technical-support product inside
`portal.estherfundsfoundation.org`. It supports technical problems across
official Esther Funds Foundation platforms without combining technical tickets
with scholarship applications, National Student Help Desk cases, or MyEFF
membership records.

Canonical routes:

- `/tech-desk`
- `/tech-desk/open-ticket`
- `/tech-desk/access`
- `/tech-desk/tickets/[ticketNumber]`
- `/tech-desk/status`
- `/tech-desk/knowledge`
- `/tech-desk/account-help`
- `/tech-desk/staff/sign-in`
- `/tech-desk/admin`

## Requester workflow

1. The requester opens one ticket and certifies that no password, verification
   code, private API key, full bank information, Social Security number, or
   unredacted identity document is included.
2. The server redacts common sensitive patterns before storage.
3. The requester verifies the email connected to the affected EFF record.
4. Deterministic diagnosis classifies the issue and checks the selected
   platform's public health.
5. The requester receives a 30-minute secure ticket link.
6. The private workspace contains safe steps, system-health context, secure
   messages, safe attachments, and an accountable event history.
7. The requester confirms resolution and closes the ticket.
8. If the requester does not respond, the hourly Tech Desk automation sends the
   configured reminders and auto-closes the inactive ticket while preserving
   its history.

## Automatic diagnosis

The initial rule library recognizes:

- Password and sign-in trouble
- Missing or expired verification email
- Expired sessions and loading loops
- Permission or record-link problems
- Document and profile-photo upload failures
- Invalid API or environment configuration
- Deployment outages
- Broken buttons and routes
- Scholarship or account-claim blockers
- General reproducible technical issues

The system does not claim that a rule diagnosis is a human decision. Confidence,
public health, recommended steps, and the need for staff review are recorded.

## Monitoring

The scheduled `/api/cron/tech-desk` route:

- Uses `CRON_SECRET` bearer authorization.
- Probes official allow-listed HTTPS endpoints.
- Records HTTP result, safe detail, latency, and timestamp.
- Optionally reads the latest GitHub workflow state.
- Optionally reads the latest Vercel production deployment state.
- Processes due requester reminders.
- Auto-closes inactive tickets only after the configured reminder cycle.

Public status exposes only safe health information. It never exposes deployment
tokens, repository secrets, database keys, project credentials, private logs, or
student information.

## Provider variables

Required existing production variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `CRON_SECRET`

Optional read-only monitoring:

- `GITHUB_MONITOR_TOKEN`
- `VERCEL_MONITOR_TOKEN`
- `VERCEL_TEAM_ID`

The optional monitoring tokens should have the minimum read-only scope needed.
The application must not receive provider write tokens merely to diagnose a
ticket.

## Production-change boundary

The Tech Desk may automatically:

- Redact common sensitive patterns
- Verify ticket ownership
- Issue short-lived ticket links
- Classify common issues
- Run public and optional read-only provider checks
- Send branded safe next steps and reminders
- Record events
- Auto-close inactive tickets

The Tech Desk does not automatically:

- Deploy or change source code
- Change Vercel environment variables, aliases, domains, or access controls
- Change GitHub repositories, branches, workflows, secrets, or permissions
- Change Supabase rows, roles, policies, keys, authentication settings, or
  schema outside an approved release migration
- Change DNS
- Change a student's application, award, financial-aid, enrollment, or
  institutional decision

These actions become remediation proposals. A privileged proposal requires a
Tech Desk lead or administrator. Approval records authorization for an
authorized administrator; it does not silently execute the production change.

## Roles

- `tech_desk_agent`: reviews tickets and sends requester updates.
- `tech_desk_lead`: may approve privileged remediation records.
- `tech_desk_admin`: manages the Tech Desk and its separate staff roles.

Tech Desk roles do not grant Scholarship Administration, National Student Help
Desk, MyEFF, Vercel, GitHub, Supabase, or DNS access.

## Private data controls

- Tech Desk tables use RLS and revoke direct `anon` and `authenticated` access.
- Service-role access is restricted to server code after contextual
  authorization.
- Ticket access tokens and verification tokens are stored as SHA-256 hashes.
- Attachments are private, limited to 5 MB, type restricted, and delivered using
  one-minute signed URLs after ticket authorization.
- Email recipient addresses are logged as hashes in delivery events.
- Public health and event summaries are intentionally safe.

## Email routing

The website's ticket, diagnosis, access, update, reminder, and closure emails are
sent through Resend and do not depend on a Codex conversation remaining active.

The connected EFF Gmail assistant should recognize technical-problem emails,
prepare a threaded reply that directs the sender to:

`https://portal.estherfundsfoundation.org/tech-desk/open-ticket`

The email reply must never ask for passwords, verification codes, private API
keys, full bank information, Social Security numbers, or unredacted identity
documents.

## Recommendation-letter requests

Recommendation letters are not Tech Desk tickets. The email assistant may
prepare truthful letter drafts for review when the requester provides sufficient
facts. It must not invent achievements, relationships, signatures, institutional
endorsements, or authority. The proposed signer and relationship basis must be
clear before a final letter is sent.

## Release validation

Before production:

1. Run unit tests.
2. Run TypeScript validation.
3. Run lint.
4. Run the production build.
5. Dry-run and apply the Tech Desk migration.
6. Confirm `nationals@estherfundsinc.org` receives `tech_desk_admin`.
7. Confirm Resend delivery from the configured EFF sender.
8. Confirm the cron has `CRON_SECRET`.
9. Test one verified ticket without private information.
10. Confirm automatic diagnosis, secure access, staff reply, requester closure,
    and follow-up scheduling.
11. Confirm a non-Tech-Desk user cannot enter `/tech-desk/admin`.
