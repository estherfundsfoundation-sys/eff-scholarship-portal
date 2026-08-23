# EFF ApplyAll data model

The migration `20260823180000_eff_applyall_foundation.sql` creates a namespace of `applyall_*` tables so scholarship applications remain separate. The central ownership chain is `auth.users → applyall_profiles → passport answers, selections, applications, tasks, batches`. Applications reference immutable route versions. Authorizations reference immutable snapshots through batch items. Receipts are unique per application. RLS ties all student-owned rows to the authenticated profile.

Institution and route truth includes source and verification fields. Real deadlines, fees, requirements, and policies must not be inserted without a verified source.
