import type {Metadata} from "next";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock3,
  KeyRound,
  Mail,
  MessageCircle,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  TicketCheck,
  Users,
  Wrench,
} from "lucide-react";
import {
  addStaffTechMessage,
  decideRemediationJob,
  rerunTechDiagnosis,
  runTechHealthCheck,
  signOutTechDesk,
} from "@/app/tech-desk/actions";
import {
  grantTechDeskRole,
  resendTechTicketInvitation,
  revokeTechDeskRole,
} from "@/app/tech-desk/admin/actions";
import {requireTechDeskStaff} from "@/lib/tech-desk-server";
import {createAdminClient} from "@/lib/supabase/admin";

export const metadata: Metadata = {title: "EFF Tech Desk Administration"};
export const dynamic = "force-dynamic";

const displayDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "Not recorded";

export default async function TechDeskAdmin() {
  const {user, roles} = await requireTechDeskStaff();
  const admin = createAdminClient();
  const [
    {data: tickets},
    {data: systems},
    {data: healthChecks},
    {data: remediation},
    {data: emailEvents},
    {data: staffRoles},
    authUsers,
  ] = await Promise.all([
    admin
      .from("tech_desk_tickets")
      .select("*")
      .order("updated_at", {ascending: false})
      .limit(300),
    admin
      .from("tech_desk_systems")
      .select("id,slug,name,base_url,health_url,provider,vercel_project,github_repo,active")
      .eq("active", true)
      .order("name"),
    admin
      .from("tech_desk_health_checks")
      .select("id,system_id,status,http_status,latency_ms,detail_safe,checked_at")
      .order("checked_at", {ascending: false})
      .limit(500),
    admin
      .from("tech_desk_remediation_jobs")
      .select("*")
      .order("created_at", {ascending: false})
      .limit(200),
    admin
      .from("tech_desk_email_events")
      .select("id,ticket_id,event_key,status,error_safe,created_at")
      .order("created_at", {ascending: false})
      .limit(200),
    admin
      .from("tech_desk_staff_roles")
      .select("user_id,role,active,granted_at,revoked_at")
      .order("granted_at", {ascending: false}),
    admin.auth.admin.listUsers({page: 1, perPage: 1000}),
  ]);

  const latestHealth = new Map<
    string,
    NonNullable<typeof healthChecks>[number]
  >();
  for (const check of healthChecks ?? []) {
    if (!latestHealth.has(check.system_id)) {
      latestHealth.set(check.system_id, check);
    }
  }
  const authById = new Map(
    authUsers.data.users.map((authUser) => [
      authUser.id,
      authUser.email ?? authUser.id,
    ]),
  );
  const ticketById = new Map(
    (tickets ?? []).map((ticket) => [ticket.id, ticket.ticket_code]),
  );
  const open = (tickets ?? []).filter(
    (ticket) =>
      !["closed_by_student", "auto_closed", "closed_by_staff"].includes(
        ticket.status,
      ),
  );
  const unverified = open.filter((ticket) => ticket.status === "unverified");
  const staffReview = open.filter((ticket) => ticket.status === "staff_review");
  const waiting = open.filter((ticket) => ticket.status === "waiting_on_student");
  const outages = (systems ?? []).filter(
    (system) => latestHealth.get(system.id)?.status === "outage",
  );
  const failedEmail = (emailEvents ?? []).filter(
    (event) => event.status === "failed",
  );
  const proposed = (remediation ?? []).filter(
    (job) => job.status === "proposed",
  );
  const canAdminRoles = roles.includes("tech_desk_admin");

  return (
    <main className="section tech-desk-admin-page">
      <div className="shell">
        <header className="tech-desk-admin-head">
          <div>
            <div className="eyebrow">Restricted EFF technical operations</div>
            <h1>Tech Desk Command Center</h1>
            <p>
              Tickets, communication, safe diagnostics, platform health,
              permission-separated staff access, and approval-controlled
              remediation.
            </p>
            <small>
              Signed in as {user.email} · {roles.join(", ").replaceAll("_", " ")}
            </small>
          </div>
          <div className="hero-actions">
            <Link className="button outline" href="/help-desk/admin">
              Student Help Desk
            </Link>
            <Link className="button outline" href="/admin">
              Scholarship Administration
            </Link>
            <form action={signOutTechDesk}>
              <button className="button outline">Sign Out</button>
            </form>
          </div>
        </header>
        <nav className="tech-desk-admin-nav" aria-label="Tech Desk administration">
          <a href="#operations">Operations</a>
          <a href="#tickets">Tickets</a>
          <a href="#systems">System Health</a>
          <a href="#remediation">Remediation</a>
          <a href="#email">Email Delivery</a>
          <a href="#staff">Staff Access</a>
          <Link href="/tech-desk/status">Public Status</Link>
          <Link href="/tech-desk/knowledge">Knowledge Library</Link>
        </nav>
        <section className="tech-desk-admin-stats" id="operations">
          <article><TicketCheck/><strong>{open.length}</strong><span>open tickets</span></article>
          <article><KeyRound/><strong>{unverified.length}</strong><span>awaiting verification</span></article>
          <article><Bot/><strong>{staffReview.length}</strong><span>need staff review</span></article>
          <article><Clock3/><strong>{waiting.length}</strong><span>waiting on requester</span></article>
          <article><AlertTriangle/><strong>{outages.length}</strong><span>confirmed public outages</span></article>
          <article><Mail/><strong>{failedEmail.length}</strong><span>failed email events in view</span></article>
        </section>

        <section className="card" id="tickets">
          <div className="section-head">
            <div>
              <div className="eyebrow">Secure technical support queue</div>
              <h2>All Tech Desk Tickets</h2>
            </div>
            <MessageCircle/>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Issue and diagnosis</th>
                  <th>Status</th>
                  <th>Latest activity</th>
                  <th>Communication and controls</th>
                </tr>
              </thead>
              <tbody>
                {(tickets ?? []).map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <strong>{ticket.ticket_code}</strong><br/>
                      <small>{ticket.requester_name}<br/>{ticket.email}</small>
                    </td>
                    <td>
                      <strong>{ticket.subject}</strong>
                      <br/>
                      <small>
                        {ticket.product_slug} · {ticket.issue_category.replaceAll("_", " ")}
                        <br/>
                        {ticket.diagnosis_code?.replaceAll("_", " ") || "Not diagnosed"}
                      </small>
                      <details>
                        <summary>View safe report</summary>
                        <p><strong>Description</strong><br/>{ticket.description}</p>
                        <p><strong>Steps</strong><br/>{ticket.steps_to_reproduce}</p>
                        {ticket.error_message && (
                          <p><strong>Error</strong><br/>{ticket.error_message}</p>
                        )}
                      </details>
                    </td>
                    <td>
                      <span className="status">{ticket.status.replaceAll("_", " ")}</span>
                      <br/><small>{ticket.priority} priority</small>
                    </td>
                    <td>
                      {displayDate(ticket.updated_at)}
                      <br/>
                      <small>
                        Student: {displayDate(ticket.last_student_message_at)}
                        <br/>
                        Team: {displayDate(ticket.last_team_message_at)}
                      </small>
                    </td>
                    <td>
                      <details>
                        <summary>Open controls</summary>
                        <form action={addStaffTechMessage} className="stack">
                          <input type="hidden" name="ticketId" value={ticket.id}/>
                          <label>
                            Secure student-facing update
                            <textarea
                              name="body"
                              required
                              minLength={2}
                              maxLength={6000}
                              placeholder="Warm, specific next steps. Never request passwords, verification codes, provider secrets, or private financial information."
                            />
                          </label>
                          <label>
                            Next status
                            <select name="nextStatus" defaultValue="waiting_on_student">
                              <option value="waiting_on_student">Waiting on student</option>
                              <option value="action_ready">Safe action ready</option>
                              <option value="staff_review">Staff review</option>
                              <option value="monitoring">Monitoring</option>
                              <option value="resolved_pending_confirmation">Resolved — awaiting confirmation</option>
                              <option value="closed_by_staff">Close by staff</option>
                            </select>
                          </label>
                          <button className="button">Email and Save Update</button>
                        </form>
                        <div className="hero-actions">
                          <form action={rerunTechDiagnosis}>
                            <input type="hidden" name="ticketId" value={ticket.id}/>
                            <button className="button outline"><RefreshCw/> Rerun Safe Diagnosis</button>
                          </form>
                          <form action={resendTechTicketInvitation}>
                            <input type="hidden" name="ticketId" value={ticket.id}/>
                            <button className="button outline"><Mail/> Resend {ticket.verified_at ? "Access" : "Verification"}</button>
                          </form>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card" id="systems">
          <div className="section-head">
            <div>
              <div className="eyebrow">Read-only monitoring</div>
              <h2>Official EFF Platform Health</h2>
            </div>
            <ServerCog/>
          </div>
          <div className="tech-desk-status-grid">
            {(systems ?? []).map((system) => {
              const check = latestHealth.get(system.id);
              const status = check?.status ?? "unknown";
              return (
                <article className="tech-desk-status-card" key={system.id}>
                  <header><h3>{system.name}</h3><span className="status">{status}</span></header>
                  <div className="tech-desk-health-line">
                    <span className={`tech-desk-health-dot ${status}`}/>
                    <strong>{status}</strong>
                    {check?.http_status && <span>HTTP {check.http_status}</span>}
                  </div>
                  <p>{check?.detail_safe || "No scheduled check recorded."}</p>
                  <small>{displayDate(check?.checked_at ?? null)}</small>
                  <form action={runTechHealthCheck}>
                    <input type="hidden" name="systemId" value={system.id}/>
                    <button className="button outline"><Activity/> Run Public Check</button>
                  </form>
                </article>
              );
            })}
          </div>
        </section>

        <section className="card" id="remediation">
          <div className="section-head">
            <div>
              <div className="eyebrow">Human authorization boundary</div>
              <h2>Remediation Proposals</h2>
            </div>
            <Wrench/>
          </div>
          <p>
            Approving a privileged proposal records authorization for an
            authorized administrator. It does not silently change Vercel,
            GitHub, Supabase, DNS, production code, data, or permissions.
          </p>
          <div className="tech-desk-admin-columns">
            {(remediation ?? []).map((job) => (
              <article className="notice" key={job.id}>
                <div>
                  <strong>
                    {job.action_type.replaceAll("_", " ")} · {job.risk_level.replaceAll("_", " ")}
                  </strong>
                  <p>{job.request_summary}</p>
                  <small>
                    {ticketById.get(job.ticket_id) || "System-wide"} · {job.status}
                    <br/>{displayDate(job.created_at)}
                  </small>
                  {job.result_safe && <p>{job.result_safe}</p>}
                  {job.status === "proposed" && (
                    <div className="hero-actions">
                      <form action={decideRemediationJob}>
                        <input type="hidden" name="jobId" value={job.id}/>
                        <input type="hidden" name="decision" value="approved"/>
                        <button className="button"><CheckCircle2/> Approve Record</button>
                      </form>
                      <form action={decideRemediationJob}>
                        <input type="hidden" name="jobId" value={job.id}/>
                        <input type="hidden" name="decision" value="cancelled"/>
                        <button className="button outline">Cancel Proposal</button>
                      </form>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
          {!proposed.length && <p className="muted">No remediation decisions are waiting.</p>}
        </section>

        <div className="tech-desk-admin-columns">
          <section className="card" id="email">
            <Mail/>
            <h2>Email Delivery</h2>
            <p>
              <strong>{emailEvents?.filter((event) => event.status === "sent").length ?? 0}</strong>{" "}
              accepted and <strong>{failedEmail.length}</strong> failed events are
              visible in the current window.
            </p>
            <ul className="tech-desk-history">
              {(emailEvents ?? []).slice(0, 30).map((event) => (
                <li key={event.id}>
                  <span/>
                  <div>
                    <strong>{event.event_key.replaceAll("_", " ")} · {event.status}</strong>
                    <br/><small>{displayDate(event.created_at)}</small>
                    {event.error_safe && <p>{event.error_safe}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section className="card">
            <BarChart3/>
            <h2>Operations Summary</h2>
            <p><strong>{tickets?.length ?? 0}</strong> total tickets in view</p>
            <p><strong>{open.filter((ticket) => ticket.priority === "P1").length}</strong> open P1 tickets</p>
            <p><strong>{open.filter((ticket) => ticket.status === "resolved_pending_confirmation").length}</strong> waiting for resolution confirmation</p>
            <p><strong>{tickets?.filter((ticket) => ticket.status === "auto_closed").length ?? 0}</strong> auto-closed after reminders</p>
          </section>
        </div>

        <section className="card" id="staff">
          <div className="section-head">
            <div>
              <div className="eyebrow">Separate role-based permissions</div>
              <h2>Tech Desk Staff Access</h2>
            </div>
            <Users/>
          </div>
          {canAdminRoles ? (
            <>
              <form action={grantTechDeskRole} className="stack" style={{maxWidth: 640}}>
                <label>
                  Existing EFF account email
                  <input name="email" type="email" required/>
                </label>
                <label>
                  Tech Desk role
                  <select name="role" defaultValue="tech_desk_agent">
                    <option value="tech_desk_agent">Tech Desk agent</option>
                    <option value="tech_desk_lead">Tech Desk lead</option>
                    <option value="tech_desk_admin">Tech Desk administrator</option>
                  </select>
                </label>
                <button className="button"><ShieldCheck/> Grant Separate Tech Desk Role</button>
              </form>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Account</th><th>Role</th><th>Status</th><th>Control</th></tr></thead>
                  <tbody>
                    {(staffRoles ?? []).map((roleRecord) => (
                      <tr key={`${roleRecord.user_id}-${roleRecord.role}`}>
                        <td>{authById.get(roleRecord.user_id) || roleRecord.user_id}</td>
                        <td>{roleRecord.role.replaceAll("_", " ")}</td>
                        <td>{roleRecord.active ? "active" : "revoked"}</td>
                        <td>
                          {roleRecord.active &&
                            authById.get(roleRecord.user_id)?.toLowerCase() !==
                              "nationals@estherfundsinc.org" && (
                              <form action={revokeTechDeskRole}>
                                <input type="hidden" name="userId" value={roleRecord.user_id}/>
                                <input type="hidden" name="role" value={roleRecord.role}/>
                                <button className="button outline">Revoke Role</button>
                              </form>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p>Only a Tech Desk administrator can grant or revoke staff roles.</p>
          )}
        </section>
        <div className="notice">
          <AlertTriangle/>
          <span>
            Scholarship, Student Help Desk, MyEFF, and Tech Desk permissions are
            separate. Access to one system never grants automatic access to another.
          </span>
        </div>
      </div>
    </main>
  );
}
