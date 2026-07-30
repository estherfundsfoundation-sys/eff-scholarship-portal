import type {Metadata} from "next";
import Link from "next/link";
import {AlertTriangle, CheckCircle2, KeyRound, LockKeyhole, Mail} from "lucide-react";
import {requestTechTicketAccess} from "@/app/tech-desk/actions";

export const metadata: Metadata = {title: "Access Your Tech Desk Ticket"};

type Query = {sent?: string; expired?: string; error?: string; ticketNumber?: string};

export default async function TechDeskAccess({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const query = await searchParams;
  return (
    <main className="section">
      <div className="shell tech-desk-access-grid">
        <section>
          <div className="eyebrow">Private ticket access</div>
          <h1>Access Your EFF Tech Desk Ticket</h1>
          <p className="lead">View the diagnosis, secure messages, system-health snapshot, next steps, and resolution history.</p>
          <div className="privacy-banner"><LockKeyhole/><div><strong>We send a time-limited link to the verified ticket email.</strong><span>Never forward the link. A Tech Desk ticket number is not a scholarship application or Help Desk case number.</span></div></div>
          {query.sent && <div className="notice" role="status"><CheckCircle2/><span>If the ticket number and email matched, a secure link is on its way. Check Spam, Promotions, Updates, and school quarantine folders.</span></div>}
          {query.expired && <div className="notice" role="alert"><AlertTriangle/><span>The secure link expired. Send yourself a fresh link below.</span></div>}
          {query.error && <div className="notice" role="alert"><AlertTriangle/>{query.error}</div>}
          <form action={requestTechTicketAccess} className="card tech-desk-access-form">
            <label>Tech Desk ticket number<input name="ticketNumber" required defaultValue={query.ticketNumber ?? ""} placeholder="EFF-TECH-2026-AB12CD34" autoCapitalize="characters"/></label>
            <label>Verified email address<input type="email" name="email" required autoComplete="email"/></label>
            <button className="button"><Mail/> Send My Secure Ticket Link</button>
          </form>
          <p><Link href="/tech-desk/open-ticket">Open a new technical-support ticket</Link></p>
        </section>
        <aside className="tech-desk-auth-aside">
          <KeyRound/>
          <h2>Which number do I use?</h2>
          <p>Tech Desk ticket numbers begin with <strong>EFF-TECH-</strong>. Student Help Desk cases and scholarship applications use different records.</p>
          <hr/>
          <strong>Still waiting for an email?</strong>
          <p>Search all mail for “EFF Tech Desk,” open only the newest message, and add notifications@estherfundsinc.org to safe senders.</p>
          <Link className="button outline" href="/tech-desk/knowledge">Open the Help Library</Link>
        </aside>
      </div>
    </main>
  );
}
