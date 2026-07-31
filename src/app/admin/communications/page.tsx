import Link from "next/link";
import {requireAdmin} from "@/lib/auth/staff";
import {
  queueNationalPartnerOutreach,
  retryFailedMessage,
  saveTemplate,
} from "./actions";
import {
  NameYourNeedReceiptControl,
  type NameYourNeedReceiptMetrics,
} from "./name-your-need-receipt-control";

type Query = {
  partnerQueued?: string;
  partnerEligible?: string;
  receiptQueued?: string;
  receiptRetried?: string;
  receiptError?: string;
};

const emptyReceiptMetrics: NameYourNeedReceiptMetrics = {
  recipient_count: 0,
  eligible_count: 0,
  queued_count: 0,
  processing_count: 0,
  failed_count: 0,
  sent_count: 0,
  suppressed_count: 0,
  invalid_count: 0,
  duplicate_count: 0,
};

export default async function Communications({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const query = await searchParams;
  const {supabase, roles} = await requireAdmin();
  const [
    messagesResult,
    templatesResult,
    sentResult,
    queuedResult,
    failedResult,
    processingResult,
    suppressedResult,
    claimedResult,
    receiptMetricsResult,
  ] = await Promise.all([
    supabase
      .from("messages")
      .select(
        "id,recipient,template_key,status,attempts,sent_at,last_error_safe,created_at,payload_private",
      )
      .order("created_at", {ascending: false})
      .limit(250),
    supabase
      .from("email_templates")
      .select("id,event_key,subject,body,version,programs(name)")
      .order("event_key"),
    supabase.from("messages").select("id", {count: "exact", head: true}).eq("status", "sent"),
    supabase.from("messages").select("id", {count: "exact", head: true}).eq("status", "queued"),
    supabase.from("messages").select("id", {count: "exact", head: true}).eq("status", "failed"),
    supabase.from("messages").select("id", {count: "exact", head: true}).eq("status", "processing"),
    supabase.from("email_suppressions").select("email", {count: "exact", head: true}),
    supabase
      .from("legacy_claim_tokens")
      .select("id", {count: "exact", head: true})
      .not("claimed_at", "is", null),
    supabase.rpc("name_your_need_receipt_metrics"),
  ]);

  const messages = messagesResult.data;
  const templates = templatesResult.data;
  const receiptMetrics =
    ((Array.isArray(receiptMetricsResult.data)
      ? receiptMetricsResult.data[0]
      : receiptMetricsResult.data) as NameYourNeedReceiptMetrics | null) ??
    emptyReceiptMetrics;
  const metrics = [
    ["Accepted by provider", sentResult.count ?? 0],
    ["Queued", queuedResult.count ?? 0],
    ["Processing", processingResult.count ?? 0],
    ["Failed", failedResult.count ?? 0],
    ["Suppressed / bounced", suppressedResult.count ?? 0],
    ["Accounts claimed", claimedResult.count ?? 0],
  ];

  return (
    <main className="section white">
      <div className="shell">
        <Link className="card-link" href="/admin">
          ← Command center
        </Link>
        <div className="eyebrow">Transactional email control center</div>
        <h2>Delivery health and communication history</h2>
        <p className="muted">
          “Accepted” means Resend accepted the message for delivery.
          Suppressions prevent repeated delivery to known bad or opted-out
          addresses.
        </p>
        {query.partnerQueued !== undefined && (
          <div className="notice success-text">
            National partner campaign activated: {query.partnerQueued} new
            invitation{query.partnerQueued === "1" ? "" : "s"} queued from{" "}
            {query.partnerEligible ?? query.partnerQueued} eligible institution
            contact{query.partnerEligible === "1" ? "" : "s"}.
          </div>
        )}
        {query.receiptError && (
          <div className="notice error-text" role="alert">
            <strong>Receipt control did not run:</strong> {query.receiptError}
          </div>
        )}
        {receiptMetricsResult.error && (
          <div className="notice error-text" role="alert">
            Receipt metrics are unavailable until the required database
            migration is applied.
          </div>
        )}
        <div className="stats email-health-stats">
          {metrics.map(([label, value]) => (
            <div className="stat" key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <NameYourNeedReceiptControl
          metrics={receiptMetrics}
          queuedNow={query.receiptQueued}
          retriedNow={query.receiptRetried}
          canManage={roles.some((role) => role.role === "super_admin")}
        />

        <div className="resource-actions" style={{marginTop: 24}}>
          <Link className="button" href="/api/admin/export/communications">
            Export communication history
          </Link>
          <Link className="button outline" href="/admin/imports">
            Invitation batches
          </Link>
          <form action={queueNationalPartnerOutreach}>
            <button className="button">Queue national partner invitations</button>
          </form>
        </div>
        <details className="card" style={{marginTop: 24}}>
          <summary>
            <strong>Edit email templates</strong>
          </summary>
          {templates?.map((template) => (
            <form
              action={saveTemplate}
              className="stack template-editor"
              key={template.id}
            >
              <input type="hidden" name="template_id" value={template.id} />
              <h3>
                {template.event_key.replaceAll("_", " ")} · version{" "}
                {template.version}
              </h3>
              <label>
                Subject
                <input name="subject" defaultValue={template.subject} required />
              </label>
              <label>
                Body
                <textarea
                  name="body"
                  defaultValue={template.body}
                  rows={6}
                  required
                />
              </label>
              <button className="button outline">Save template</button>
            </form>
          ))}
        </details>
        <div className="table-wrap" style={{marginTop: 24}}>
          <table>
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Type</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Created / sent</th>
                <th>Control</th>
              </tr>
            </thead>
            <tbody>
              {messages?.map((message) => (
                <tr key={message.id}>
                  <td>{message.recipient}</td>
                  <td>{message.template_key?.replaceAll("_", " ")}</td>
                  <td>
                    <span className={`status status-${message.status}`}>
                      {message.status}
                    </span>
                    {message.last_error_safe && (
                      <small className="error-text">
                        {message.last_error_safe}
                      </small>
                    )}
                  </td>
                  <td>{message.attempts}</td>
                  <td>
                    {new Date(message.created_at).toLocaleString()}
                    <br />
                    <small>
                      {message.sent_at
                        ? `Sent ${new Date(message.sent_at).toLocaleString()}`
                        : "Not sent"}
                    </small>
                  </td>
                  <td>
                    {message.status === "failed" &&
                    message.payload_private ? (
                      <form action={retryFailedMessage}>
                        <input
                          type="hidden"
                          name="message_id"
                          value={message.id}
                        />
                        <button className="button outline">Retry safely</button>
                      </form>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
