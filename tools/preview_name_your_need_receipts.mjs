import {createHash} from "node:crypto";
import {createClient} from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
  );
}

const supabase = createClient(url, serviceKey, {
  auth: {persistSession: false, autoRefreshToken: false},
});

async function readAll(table, columns, configure = (query) => query) {
  const rows = [];
  for (let offset = 0; offset < 50000; offset += 1000) {
    const query = configure(
      supabase
        .from(table)
        .select(columns)
        .range(offset, offset + 999),
    );
    const {data, error} = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return rows;
}

const applications = await readAll(
  "applications",
  "id,status,submitted_at,original_submitted_at,profiles!applications_applicant_id_fkey(primary_email,preferred_name,legal_name),program_cycles!inner(name,programs!inner(slug))",
  (query) =>
    query.in("status", [
      "applied",
      "review_by_admin",
      "additional_information_needed",
    ]),
);
const suppressions = await readAll("email_suppressions", "email");
const messages = await readAll(
  "messages",
  "idempotency_key,status,template_key",
  (query) =>
    query.eq(
      "template_key",
      "name_your_need_application_receipt_2026",
    ),
);

const now = Date.now();
const priority = {
  review_by_admin: 1,
  additional_information_needed: 2,
  applied: 3,
};
const submitted = applications
  .filter(
    (application) =>
      application.program_cycles?.name === "2026" &&
      application.program_cycles?.programs?.slug === "name-your-need",
  )
  .filter((application) => {
    if (application.status === "applied") return true;
    const timestamp =
      application.submitted_at ?? application.original_submitted_at;
    return Boolean(timestamp && Date.parse(timestamp) <= now);
  })
  .map((application) => {
    const email = String(
      application.profiles?.primary_email ?? "",
    )
      .trim()
      .toLowerCase();
    return {
      applicationId: application.id,
      status: application.status,
      email,
      submittedAt:
        application.submitted_at ??
        application.original_submitted_at ??
        "",
    };
  })
  .sort(
    (left, right) =>
      left.email.localeCompare(right.email) ||
      priority[left.status] - priority[right.status] ||
      right.submittedAt.localeCompare(left.submittedAt) ||
      left.applicationId.localeCompare(right.applicationId),
  );

const suppressed = new Set(
  suppressions.map((row) => String(row.email).trim().toLowerCase()),
);
const seen = new Set();
const canonical = [];
let duplicateCount = 0;
for (const application of submitted) {
  if (seen.has(application.email)) {
    duplicateCount += 1;
    continue;
  }
  seen.add(application.email);
  canonical.push(application);
}

function validRecipient(email) {
  if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) return false;
  const [local, domain] = email.split("@");
  if (
    /(^|[._+-])(no-?reply|do-?not-?reply|test|testing)([._+-]|$)/i.test(
      local,
    )
  ) {
    return false;
  }
  return !(
    ["example.com", "example.org", "example.net"].includes(domain) ||
    domain.endsWith(".test")
  );
}

const valid = canonical.filter((application) =>
  validRecipient(application.email),
);
const recipientRows = valid.filter(
  (application) => !suppressed.has(application.email),
);
const messageByKey = new Map(
  messages.map((message) => [message.idempotency_key, message]),
);
const idempotencyKey = (email) =>
  `name-your-need-receipt-2026:${createHash("sha256")
    .update(email)
    .digest("hex")}`;

const metrics = {
  recipient_count: recipientRows.length,
  eligible_count: recipientRows.filter(
    (application) => !messageByKey.has(idempotencyKey(application.email)),
  ).length,
  queued_count: messages.filter((message) => message.status === "queued")
    .length,
  processing_count: messages.filter(
    (message) => message.status === "processing",
  ).length,
  failed_count: messages.filter((message) => message.status === "failed")
    .length,
  sent_count: messages.filter((message) => message.status === "sent").length,
  suppressed_count: valid.filter((application) =>
    suppressed.has(application.email),
  ).length,
  invalid_count: canonical.length - valid.length,
  duplicate_count: duplicateCount,
};

process.stdout.write(`${JSON.stringify(metrics, null, 2)}\n`);
