import type {Metadata} from "next";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import {
  closeTechTicketByStudent,
  sendStudentTechMessage,
} from "@/app/tech-desk/actions";
import {validateTechTicketAccess} from "@/lib/tech-desk-access";

export const metadata: Metadata = {title: "Secure Tech Desk Ticket"};

type Props = {
  params: Promise<{ticketNumber: string}>;
  searchParams: Promise<{
    access?: string;
    message?: string;
    closed?: string;
  }>;
};

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Not recorded";

export default async function TechDeskTicket({params, searchParams}: Props) {
  const {ticketNumber} = await params;
  const query = await searchParams;
  const access = query.access ?? "";
  const {admin, ticket, ticketCode} = await validateTechTicketAccess(
    ticketNumber,
    access,
  );
  if (!ticket) {
    return (
      <main className="section">
        <div className="shell" style={{maxWidth: 720}}>
          <section className="card">
            <LockKeyhole/>
            <div className="eyebrow">Secure ticket access</div>
            <h1>This Tech Desk link is invalid or expired.</h1>
            <p>
              Request a fresh time-limited link using the verified ticket email.
              Never forward a secure ticket link.
            </p>
            <Link
              className="button"
              href={`/tech-desk/access?expired=1&ticketNumber=${encodeURIComponent(
                ticketCode ?? "",
              )}`}
            >
              Send a Fresh Access Link
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const [{data: messages}, {data: events}, {data: attachments}] =
    await Promise.all([
      admin
        .from("tech_desk_messages")
        .select("id,author_type,author_name,body,created_at")
        .eq("ticket_id", ticket.id)
        .eq("internal_only", false)
        .order("created_at"),
      admin
        .from("tech_desk_events")
        .select("id,event_type,summary_safe,created_at")
        .eq("ticket_id", ticket.id)
        .order("created_at", {ascending: false})
        .limit(50),
      admin
        .from("tech_desk_attachments")
        .select("id,filename,content_type,size_bytes,created_at")
        .eq("ticket_id", ticket.id)
        .eq("quarantined", false)
        .order("created_at"),
    ]);

  const closed = [
    "closed_by_student",
    "auto_closed",
    "closed_by_staff",
  ].includes(ticket.status);
  const health =
    ticket.health_snapshot &&
    typeof ticket.health_snapshot === "object" &&
    !Array.isArray(ticket.health_snapshot)
      ? (ticket.health_snapshot as Record<string, unknown>)
      : {};
  const healthStatus =
    typeof health.status === "string" ? health.status : "unknown";
  const steps = Array.isArray(ticket.recommended_steps)
    ? ticket.recommended_steps.filter(
        (step: unknown): step is string => typeof step === "string",
      )
    : [];

  return (
    <main className="tech-desk-ticket-page">
      <section className="tech-desk-ticket-hero">
        <div className="shell">
          <div>
            <div className="tech-desk-kicker">
              <ShieldCheck/> Verified private workspace
            </div>
            <h1>{ticket.ticket_code}</h1>
            <p>{ticket.subject}</p>
          </div>
          <div className="tech-desk-ticket-badge">
            <Clock3/>
            <strong>{ticket.status.replaceAll("_", " ")}</strong>
            <span>{ticket.priority} priority</span>
          </div>
        </div>
      </section>
      <nav className="shell tech-desk-ticket-nav" aria-label="Ticket sections">
        <a href="#diagnosis">Diagnosis</a>
        <a href="#conversation">Secure Messages</a>
        <a href="#documents">Documents</a>
        <a href="#history">History</a>
        <Link href="/tech-desk/access">Request Fresh Access</Link>
      </nav>
      <div className="shell tech-desk-ticket-grid">
        <div>
          {query.message && (
            <div className="notice" role="status">
              <CheckCircle2/> Your secure update was added to the ticket.
            </div>
          )}
          {query.closed && (
            <div className="notice" role="status">
              <CheckCircle2/> You closed this ticket. Its history remains
              available through a fresh secure link.
            </div>
          )}
          <section className="card" id="diagnosis">
            <Activity/>
            <div className="eyebrow">Safe automatic diagnosis</div>
            <h2>
              {ticket.diagnosis_code
                ? ticket.diagnosis_code.replaceAll("_", " ")
                : "Diagnosis pending"}
            </h2>
            <p>
              {ticket.diagnosis_summary ||
                "The Tech Desk is reviewing the verified issue details."}
            </p>
            <div className="tech-desk-health-line">
              <span
                className={`tech-desk-health-dot ${healthStatus}`}
                aria-hidden="true"
              />
              <strong>Public platform health: {healthStatus}</strong>
              {typeof health.httpStatus === "number" && (
                <span>HTTP {health.httpStatus}</span>
              )}
            </div>
            {steps.length > 0 && (
              <>
                <h3>Your next steps</h3>
                <ol className="tech-desk-diagnosis-steps">
                  {steps.map((step: string) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </>
            )}
            <div className="notice">
              <AlertTriangle/>
              <span>
                Safe diagnostics never need your password, verification code,
                private API key, Social Security number, or full bank details.
              </span>
            </div>
          </section>
          <section className="card" id="conversation">
            <MessageCircle/>
            <div className="eyebrow">Private ticket conversation</div>
            <h2>Secure Messages</h2>
            <div className="tech-desk-message-list">
              {(messages ?? []).map((message) => (
                <article
                  className={`tech-desk-message ${message.author_type}`}
                  key={message.id}
                >
                  <div>
                    <strong>{message.author_name}</strong>
                    <small>{formatDate(message.created_at)}</small>
                  </div>
                  {message.body}
                </article>
              ))}
            </div>
            {!closed ? (
              <form action={sendStudentTechMessage} className="stack">
                <input
                  type="hidden"
                  name="ticketNumber"
                  value={ticket.ticket_code}
                />
                <input type="hidden" name="access" value={access}/>
                <label>
                  Add a secure update
                  <textarea
                    name="body"
                    required
                    minLength={2}
                    maxLength={6000}
                    placeholder="Tell us what changed after you completed the recommended steps. Remove passwords, codes, keys, and private financial information."
                  />
                </label>
                <button className="button">Send Secure Update</button>
              </form>
            ) : (
              <p className="muted">
                This ticket is closed. Open a new ticket if the issue returned
                or a different problem started.
              </p>
            )}
          </section>
          <section className="card" id="documents">
            <FileText/>
            <div className="eyebrow">Safe ticket files</div>
            <h2>Documents and Screenshots</h2>
            {attachments?.length ? (
              <ul>
                {attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <a
                      href={`/tech-desk/attachments/${attachment.id}?ticketNumber=${encodeURIComponent(
                        ticket.ticket_code,
                      )}&access=${encodeURIComponent(access)}`}
                    >
                      {attachment.filename}
                    </a>{" "}
                    <small>
                      ({Math.ceil(attachment.size_bytes / 1024)} KB)
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No safe attachments are stored.</p>
            )}
          </section>
          <section className="card" id="history">
            <div className="eyebrow">Accountable support history</div>
            <h2>Ticket Timeline</h2>
            <ul className="tech-desk-history">
              {(events ?? []).map((event) => (
                <li key={event.id}>
                  <span/>
                  <div>
                    <strong>{event.summary_safe}</strong>
                    <br/>
                    <small>{formatDate(event.created_at)}</small>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <aside>
          <section className="card">
            <LockKeyhole/>
            <h2>Ticket Details</h2>
            <p><strong>Platform</strong><br/>{ticket.product_slug}</p>
            <p><strong>Problem type</strong><br/>{ticket.issue_category.replaceAll("_", " ")}</p>
            <p><strong>Opened</strong><br/>{formatDate(ticket.created_at)}</p>
            <p><strong>Last updated</strong><br/>{formatDate(ticket.updated_at)}</p>
          </section>
          {!closed && (
            <section className="card">
              <CheckCircle2/>
              <h2>Issue Fixed?</h2>
              <p>
                You control closure. Confirm the outcome so the Tech Desk stops
                reminders and preserves the completed record.
              </p>
              <form action={closeTechTicketByStudent} className="stack">
                <input
                  type="hidden"
                  name="ticketNumber"
                  value={ticket.ticket_code}
                />
                <input type="hidden" name="access" value={access}/>
                <label>
                  What fixed the issue? <span className="muted">(optional)</span>
                  <textarea name="closureReason" maxLength={500}/>
                </label>
                <label>
                  Support rating <span className="muted">(optional)</span>
                  <select name="rating" defaultValue="">
                    <option value="">Select 1 to 5</option>
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <option value={rating} key={rating}>
                        {rating}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="button outline">Confirm and Close Ticket</button>
              </form>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
