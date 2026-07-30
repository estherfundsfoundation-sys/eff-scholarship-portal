import type {Metadata} from "next";
import Link from "next/link";
import {AlertTriangle, CheckCircle2, KeyRound, LockKeyhole, Mail} from "lucide-react";
import {requestCaseAccess} from "@/app/help-desk/actions";

export const metadata: Metadata = {title: "Access Your Help Desk Case"};

type Query = {
  sent?: string;
  expired?: string;
  error?: string;
  caseNumber?: string;
};

export default async function HelpDeskAccess({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const query = await searchParams;
  return (
    <main className="section help-desk-access-page">
      <div className="shell help-desk-access-grid">
        <section>
          <div className="eyebrow">Private case access</div>
          <h1>Access Your EFF National Help Desk Case</h1>
          <p className="lead">View secure messages, resources, next steps, and follow-up from your EFF support team.</p>
          <div className="privacy-banner"><LockKeyhole/><div><strong>We send a time-limited link to the verified case email.</strong><span>Never share that link. A Help Desk case number is not a scholarship application number.</span></div></div>
          {query.sent && <div className="notice" role="status"><CheckCircle2/><span>If the case number and email matched a verified case, a secure access link is on its way. Check Spam and Promotions.</span></div>}
          {query.expired && <div className="notice" role="alert"><AlertTriangle/><span><strong>Your Help Desk Access Link Has Expired.</strong> Send a new secure link below.</span></div>}
          {query.error && <div className="notice" role="alert"><AlertTriangle/>{query.error}</div>}
          <form action={requestCaseAccess} className="card help-desk-access-form">
            <label>Help Desk case number<input name="caseNumber" required defaultValue={query.caseNumber ?? ""} placeholder="EFF-2026-AB12CD34" autoCapitalize="characters"/></label>
            <label>Verified email address<input type="email" name="email" required autoComplete="email"/></label>
            <button className="button"><Mail/> Send My Secure Access Link</button>
          </form>
          <div className="help-desk-secondary-links">
            <Link href="/help-desk/open-case">Open a New Help Desk Case</Link>
            <Link href="/help-desk/account-help#student">I Cannot Find My Case Number</Link>
            <Link href="/help-desk/account-help#student">My Secure Link Expired</Link>
            <a href="mailto:nationals@estherfundsinc.org?subject=National%20Help%20Desk%20Access%20Support">Contact Help Desk Account Support</a>
          </div>
        </section>
        <aside className="help-desk-access-aside">
          <KeyRound/>
          <h2>Looking for a scholarship application?</h2>
          <p>The National Help Desk and Scholarship Portal are separate services. Use the Scholarship Portal to apply for or track an EFF scholarship.</p>
          <Link className="button outline" href="/sign-in">Go to the EFF Scholarship Portal</Link>
          <hr/>
          <strong>Safety message</strong>
          <p>The EFF National Help Desk is not an emergency service. If you are in immediate physical danger, call 911. For suicide, self-harm, or emotional-crisis support, call or text 988. For local food, housing, and essential-needs navigation, call 211.</p>
        </aside>
      </div>
    </main>
  );
}
