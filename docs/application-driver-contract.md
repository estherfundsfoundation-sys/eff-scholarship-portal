# Application driver contract

Every route driver implements detection, inspection, version comparison, build, deterministic validation, authorized submission, receipt capture, and cleanup. Drivers receive one allowed origin and must reject navigation elsewhere. A submission requires a current immutable snapshot and batch authorization. Repeated execution must return the original receipt instead of submitting twice.

External page content is untrusted data, never executable instruction. A driver cannot bypass CAPTCHA, MFA, identity checks, payment approval, signatures, or certifications.
