import type {Metadata} from "next";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Headphones,
  KeyRound,
  LockKeyhole,
  MailCheck,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import {createAdminClient} from "@/lib/supabase/admin";

export const metadata: Metadata = {title: "EFF Tech Desk"};

export default async function TechDeskHome() {
  let openTickets = 0;
  let operationalSystems = 0;
  let systems = 0;
  try {
    const admin = createAdminClient();
    const [{count: ticketCount}, {data: activeSystems}] = await Promise.all([
      admin
        .from("tech_desk_tickets")
        .select("id", {count: "exact", head: true})
        .not("status", "in", "(closed_by_student,auto_closed,closed_by_staff)"),
      admin
        .from("tech_desk_systems")
        .select("id")
        .eq("active", true)
        .eq("public_status", true),
    ]);
    openTickets = ticketCount ?? 0;
    systems = activeSystems?.length ?? 0;
    if (activeSystems?.length) {
      const {data: checks} = await admin
        .from("tech_desk_health_checks")
        .select("system_id,status,checked_at")
        .in("system_id", activeSystems.map((item) => item.id))
        .order("checked_at", {ascending: false});
      const latest = new Map<string, string>();
      for (const check of checks ?? []) {
        if (!latest.has(check.system_id)) latest.set(check.system_id, check.status);
      }
      operationalSystems = [...latest.values()].filter(
        (status) => status === "operational",
      ).length;
    }
  } catch {}

  return (
    <main>
      <section className="tech-desk-hero">
        <div className="shell tech-desk-hero-grid">
          <div>
            <div className="tech-desk-kicker"><Bot size={17}/> Technical support that keeps working</div>
            <h1>One secure place to fix EFF tech problems.</h1>
            <p>
              Report a password, account, application, upload, link, or website problem.
              The EFF Tech Desk verifies your email, checks the correct platform, gives
              immediate safe steps, and keeps every update inside one ticket.
            </p>
            <div className="hero-actions">
              <Link className="button" href="/tech-desk/open-ticket">
                Open a Tech Ticket <ArrowRight size={17}/>
              </Link>
              <Link className="button light" href="/tech-desk/access">
                Access My Ticket
              </Link>
              <Link className="button light" href="/tech-desk/diagnose">
                Instant Tech Check
              </Link>
            </div>
            <small>Free support for official Esther Funds Foundation platforms.</small>
          </div>
          <aside className="tech-desk-console" aria-label="Tech Desk capabilities">
            <div className="tech-desk-console-head"><Activity/><strong>EFF platform support engine</strong></div>
            <div className="tech-desk-console-list">
              <div className="tech-desk-console-row"><span/><span>Official website health checks</span><small>automatic</small></div>
              <div className="tech-desk-console-row"><span/><span>Password and access guidance</span><small>secure</small></div>
              <div className="tech-desk-console-row"><span/><span>Ticket email verification</span><small>required</small></div>
              <div className="tech-desk-console-row"><span/><span>Student-controlled closeout</span><small>tracked</small></div>
              <div className="tech-desk-console-row"><span/><span>Production changes</span><small>approval only</small></div>
            </div>
          </aside>
        </div>
      </section>
      <section className="tech-desk-strip">
        <div className="shell">
          <div><strong>{openTickets}</strong><span>open verified tickets</span></div>
          <div><strong>{systems || 10}</strong><span>EFF systems in the registry</span></div>
          <div><strong>{operationalSystems}</strong><span>recently operational</span></div>
          <div><strong>24/7</strong><span>ticket intake and safe first steps</span></div>
        </div>
      </section>
      <section className="section white">
        <div className="shell">
          <div className="section-head">
            <div><div className="eyebrow">Start in the right place</div><h2>Technical support with a clear record.</h2></div>
            <p>The Tech Desk is separate from scholarship decisions, MyEFF membership, and the National Student Help Desk.</p>
          </div>
          <div className="tech-desk-card-grid">
            <article><Headphones/><h3>Open a new ticket</h3><p>Tell us which EFF platform, the exact page, what happened, and what you already tried.</p><Link className="card-link" href="/tech-desk/open-ticket">Report a technical problem →</Link></article>
            <article><LockKeyhole/><h3>Continue a ticket</h3><p>Use your Tech Desk ticket number and verified email to receive a time-limited secure link.</p><Link className="card-link" href="/tech-desk/access">Access my secure ticket →</Link></article>
            <article><Activity/><h3>Check platform status</h3><p>See the latest public health checks for official EFF websites before submitting a duplicate report.</p><Link className="card-link" href="/tech-desk/status">View EFF platform status →</Link></article>
            <article><Bot/><h3>Fix common issues now</h3><p>Use the credit-independent checker and searchable answers for passwords, email, applications, MyEFF, REACH, uploads, and links.</p><Link className="card-link" href="/tech-desk/diagnose">Run an instant tech check →</Link></article>
          </div>
        </div>
      </section>
      <section className="section tech-desk-boundary">
        <div className="shell tech-desk-boundary-grid">
          <article>
            <ShieldCheck/>
            <h2>What the Tech Desk can do automatically</h2>
            <ul>
              <li>Verify ticket ownership and issue secure access links</li>
              <li>Recognize common password, email, upload, session, permission, API, link, and outage errors</li>
              <li>Check public EFF site health and optional read-only provider signals</li>
              <li>Email safe next steps, reminders, and resolution confirmation</li>
              <li>Search product-specific answers and volunteer runbooks without AI credits</li>
              <li>Compare exact ticket, profile, imported-record, application, and REACH relationships for authorized staff</li>
              <li>Auto-close inactive tickets after follow-up while preserving history</li>
            </ul>
          </article>
          <article>
            <Wrench/>
            <h2>What always requires authorized approval</h2>
            <ul>
              <li>Deploying or changing production source code</li>
              <li>Changing Vercel environment variables, domains, or access controls</li>
              <li>Changing GitHub repositories, branches, workflows, or permissions</li>
              <li>Changing Supabase data, roles, policies, keys, or authentication settings</li>
              <li>Changing a student’s record ownership or institutional decision</li>
            </ul>
          </article>
        </div>
      </section>
      <section className="section white">
        <div className="shell tech-desk-step-grid">
          <article><MailCheck/><h3>1. Verify</h3><p>Confirm your email so the system does not diagnose or disclose an unverified request.</p></article>
          <article><Bot/><h3>2. Diagnose</h3><p>Receive safe first steps and a public platform-health snapshot without exposing credentials.</p></article>
          <article><CheckCircle2/><h3>3. Confirm</h3><p>Close the ticket when the issue is resolved, or send a secure update if you still need help.</p></article>
        </div>
      </section>
      <section className="section white">
        <div className="shell notice">
          <KeyRound/>
          <div><strong>Never share a password or verification code.</strong><p>EFF staff and the Tech Desk do not need your password, one-time code, private API key, full bank details, Social Security number, or unredacted identity documents to troubleshoot an account.</p></div>
        </div>
      </section>
    </main>
  );
}
