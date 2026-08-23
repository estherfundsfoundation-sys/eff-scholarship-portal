# EFF ApplyAll threat model

Primary threats are account takeover, cross-student disclosure, malicious uploads, credential or session theft, prompt injection from external portals, unauthorized fees, duplicate submissions, route drift, supporter overreach, and sensitive logging.

Controls include Supabase RLS, student-scoped ownership, minimal supporter grants, route/domain allowlists, immutable snapshot hashes, idempotency keys, explicit fee ceilings, route version approval, four independent execution flags, redacted structured logs, short-lived sessions, upload validation interfaces, rate limits, CSP/CSRF protections, and auditable privileged actions. University credentials, MFA codes, FSA IDs, security answers, and full card data are prohibited storage.
