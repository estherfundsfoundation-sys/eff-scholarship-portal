# National Student Help Desk: Authentication and Product Separation

Last updated: July 29, 2026

## Scope and preservation boundary

The EFF National Student Help Desk remains inside the existing application deployed at `portal.estherfundsfoundation.org`. This change is additive. Existing `student_help_cases`, `student_help_case_events`, case numbers, verification records, routing, school outreach, follow-up automation, and student essentials data remain authoritative.

The Help Desk is not MyEFF and is not the EFF Scholarship Portal. A shared Supabase identity may be reused, but each product has separate routes, copy, profiles, permissions, records, and post-authentication destinations.

## Pre-change audit

### Existing Help Desk routes

- Public intake: `/resources/student-help`
- Verification callback: `/resources/student-help/verify`
- Scholarship-admin case list: `/admin/student-help`
- Follow-up automation: `/api/cron/student-help-followups`
- Training adjacent to the Help Desk: `/academy/financial-aid-peer-mentor`

### Existing scholarship routes

- Applicant registration and sign-in: `/sign-up`, `/sign-in`
- Applicant home: `/dashboard`
- Applications: `/applications`
- Scholarship administration: `/admin`
- Scholarship account help: `/account-help`

### Existing authentication and session behavior

- One Supabase Auth identity and cookie-backed session.
- Generic middleware sent all protected routes to `/sign-in`.
- Authenticated users visiting generic `/sign-in` or `/sign-up` were sent to `/dashboard`.
- Generic titles and navigation used `Sign in`, `Create an account`, and `My portal`.
- Scholarship staff authorization lived in `user_roles`.
- Help Desk administration reused scholarship `program_admin` and `super_admin` access.
- Password recovery and verification callbacks defaulted to Scholarship Portal copy and destinations.

### Product-confusion risks found

1. Help Desk intake rendered under the Scholarship Portal header and footer.
2. The public header used the vague label `My portal`.
3. Help Desk staff access went through scholarship administration.
4. A generic `/sign-in?next=/help-desk/...` would have displayed Scholarship Portal language.
5. No dedicated case-access, volunteer-authentication, or Help Desk account-help experience existed.
6. A scholarship staff role implied Help Desk transcript access through `/admin/student-help`.
7. Help Desk verification did not enter a dedicated secure case workspace.
8. Password reset, logout, browser titles, emails, and errors did not retain Help Desk role context.

## Product-context mechanism

`src/lib/help-desk-context.ts` defines:

- `student`
- `volunteer`
- `staff`

Every Help Desk redirect is constrained to the allowed namespace for its persona. External URLs, protocol-relative URLs, backslashes, control characters, cross-product destinations, and cross-role destinations fall back to a safe Help Desk route.

Middleware corrects old generic Help Desk sign-in links before generic Scholarship Portal copy renders:

- Help Desk volunteer destinations → `/help-desk/volunteer/sign-in`
- Help Desk administration destinations → `/help-desk/staff/sign-in`
- Help Desk case destinations → `/help-desk/access`

## Canonical route map

### Public and student

- `/help-desk`
- `/help-desk/open-case`
- `/help-desk/access`
- `/help-desk/cases/[caseNumber]`
- `/help-desk/resources`
- `/help-desk/safety`
- `/help-desk/account-help`

### Volunteer

- `/help-desk/volunteer`
- `/help-desk/volunteer/create-account`
- `/help-desk/volunteer/sign-in`
- `/help-desk/volunteer/onboarding`
- `/help-desk/volunteer/console`

### Staff

- `/help-desk/staff/sign-in`
- `/help-desk/admin`

### Contextual recovery

- `/help-desk/password-reset`
- `/help-desk/reset-password`

### Compatibility aliases

- `/resources/student-help` → `/help-desk/open-case`
- `/resources/student-help/verify` → `/help-desk/verify`
- `/admin/student-help` → `/help-desk/admin`

Old case numbers and verification links remain supported.

## Identity and data model

One Supabase user may connect to separate records:

- Scholarship `profiles`
- `student_help_cases.user_id`
- `help_desk_volunteer_profiles`
- `help_desk_staff_roles`

Student case connection is optional. A case may be opened and accessed using email verification and a short-lived hashed access token without creating a Scholarship Portal application.

Help Desk tables use RLS with direct `anon` and `authenticated` privileges revoked. Server actions first verify the current Supabase user and then apply product-specific authorization before using the service client. Scholarship roles do not satisfy Help Desk staff authorization.

## Authorization boundaries

### Student

- A public URL contains the case number, never the database UUID.
- Access requires an unexpired hashed token sent to the case’s verified email or a previously linked matching EFF identity.
- Student-visible messages exclude `internal_only` records.

### Volunteer

- Authentication uses the existing EFF identity.
- No duplicate account is created for an existing email.
- A separate volunteer profile stores onboarding and access state.
- Six modules and a score of 100% are required.
- Only `active` volunteers enter the console.
- Suspended or revoked volunteers receive a contextual restricted-access page.
- Only explicitly assigned cases are listed.

### Staff

- Public staff account creation does not exist.
- `help_desk_staff_roles` is separate from scholarship `user_roles`.
- An authenticated scholarship reviewer without a Help Desk role receives a denial page.
- `nationals@estherfundsinc.org` is bootstrapped as Help Desk administrator when the verified Auth identity exists.

## Product-specific email and callback behavior

- Case verification: `Verify Your EFF National Help Desk Case`
- Case access: `Your Secure EFF Help Desk Case Link`
- Volunteer verification: `Verify Your EFF Help Desk Volunteer Account`
- Volunteer reset: `Reset Your Help Desk Volunteer Account Password`
- Staff reset: `National Help Desk Staff Access`
- Supervisor exception: `Help Desk Case Requires Supervisor Review`

Links return only to the applicable Help Desk route. Scholarship email templates and callbacks remain unchanged.

## Acceptance-scenario coverage

1. **New case:** `/help-desk/open-case` preserves intake, verification, routing, case number, and enters the dedicated case workspace.
2. **Existing case:** `/help-desk/access` sends a time-limited secure link to the verified case email.
3. **New volunteer:** contextual account creation verifies email and returns to onboarding.
4. **Existing EFF identity:** volunteer sign-in reuses the same identity and routes by volunteer status.
5. **Scholarship applicant opens a case:** the case may link to the existing user ID but remains in Help Desk records and routes.
6. **Old generic volunteer link:** middleware corrects it before Scholarship Portal copy renders.
7. **Help Desk staff:** dedicated staff sign-in returns to Help Desk administration.
8. **Dual-role staff:** the Help Desk shell shows a role-aware workspace switcher; dashboards are not combined.
9. **Scholarship reviewer without Help Desk role:** denied by `help_desk_staff_roles`.
10. **Volunteer and scholarship data:** volunteer console queries Help Desk tables and assigned cases only.
11. **Password reset:** contextual email and reset pages return to volunteer or staff access.
12. **Logout:** volunteer returns to Help Desk volunteer; staff returns to staff sign-in.
13. **Titles and navigation:** nested metadata and Help Desk shell retain the full product name.
14. **Account help:** dedicated Help Desk choices do not include scholarship transfer instructions.
15. **Mobile:** the product name remains visible and Help Desk navigation becomes a horizontally scrollable exact-label menu.

## Operational checks

Before production:

1. Apply `20260730010000_help_desk_product_separation.sql`.
2. Confirm `nationals@estherfundsinc.org` has `help_desk_admin`.
3. Confirm Resend can deliver from the configured EFF sender.
4. Run lint, typecheck, unit tests, and production build.
5. Test one new case, one existing case access request, one volunteer onboarding, one staff denial, and one authorized staff login.
6. Confirm old public and admin links route to the canonical Help Desk namespace.

## Remaining infrastructure responsibilities

- Enable MFA policy and session controls in Supabase for privileged staff.
- Review rate-limit thresholds and failed-login alerts at the authentication provider.
- Add named Help Desk roles only after authorization is approved.
- Never grant Help Desk roles merely because a user is a scholarship reviewer.
