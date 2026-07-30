import type {Metadata} from "next";
import Link from "next/link";
import {AlertTriangle, CheckCircle2, FileImage, LockKeyhole, ShieldCheck} from "lucide-react";
import {submitTechTicket} from "@/app/tech-desk/actions";
import {techDeskIssueCategories, techDeskProducts} from "@/lib/tech-desk";

export const metadata: Metadata = {title: "Open a Tech Desk Ticket"};

type Query = {
  error?: string;
  submitted?: string;
  delivery?: string;
  code?: string;
  closed?: string;
};

export default async function OpenTechTicket({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const query = await searchParams;
  return (
    <main className="section">
      <div className="shell tech-desk-form-grid">
        <section>
          <div className="eyebrow">Secure technical support</div>
          <h1>Open an EFF Tech Desk Ticket</h1>
          <p className="lead">One ticket keeps the problem, diagnosis, updates, and resolution together.</p>
          {query.submitted && (
            <div className="notice" role="status"><CheckCircle2/><span><strong>Ticket submitted{query.code ? `: ${query.code}` : ""}.</strong> Check your email to verify the ticket and start safe diagnostics.</span></div>
          )}
          {query.delivery === "failed" && (
            <div className="notice" role="alert"><AlertTriangle/><span><strong>Your ticket was saved{query.code ? ` as ${query.code}` : ""}, but the verification email could not be sent.</strong> Contact nationals@estherfundsinc.org with only the ticket number.</span></div>
          )}
          {query.closed && (
            <div className="notice"><AlertTriangle/><span>That ticket is closed. Open a new ticket if a different issue started or the problem returned.</span></div>
          )}
          {query.error && <div className="notice" role="alert"><AlertTriangle/>{query.error}</div>}
          <form action={submitTechTicket} className="card tech-desk-form">
            <div className="tech-desk-honeypot" aria-hidden="true">
              <label>Company website<input name="companyWebsite" tabIndex={-1} autoComplete="off"/></label>
            </div>
            <div className="two">
              <label>Legal name<input name="requesterName" required minLength={2} autoComplete="name"/></label>
              <label>Preferred name <span className="muted">(optional)</span><input name="preferredName" autoComplete="nickname"/></label>
            </div>
            <label>Email connected to the EFF account or form<input name="email" type="email" required autoComplete="email"/></label>
            <div className="two">
              <label>EFF platform
                <select name="productSlug" required defaultValue="">
                  <option value="" disabled>Select the platform</option>
                  {techDeskProducts.map((product) => <option value={product.slug} key={product.slug}>{product.name}</option>)}
                </select>
              </label>
              <label>Problem type
                <select name="issueCategory" required defaultValue="">
                  <option value="" disabled>Select the problem</option>
                  {techDeskIssueCategories.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </label>
            </div>
            <label>Exact page URL <span className="muted">(official EFF HTTPS pages only)</span><input name="pageUrl" type="url" placeholder="https://portal.estherfundsfoundation.org/..."/></label>
            <div className="two">
              <label>How blocked are you?
                <select name="urgency" required defaultValue="partially_blocked">
                  <option value="deadline_within_72_hours">Deadline within 72 hours</option>
                  <option value="fully_blocked">I cannot continue</option>
                  <option value="partially_blocked">Part of the platform is blocked</option>
                  <option value="question">Question or non-blocking problem</option>
                </select>
              </label>
              <label>Relevant deadline <span className="muted">(optional)</span><input name="deadlineAt" type="datetime-local"/></label>
            </div>
            <label>Short subject<input name="subject" required minLength={5} maxLength={180} placeholder="Example: MyEFF login says my session expired"/></label>
            <label>What happened?<textarea name="description" required minLength={40} maxLength={6000} placeholder="Explain what you expected, what happened, and whether this affects a deadline."/></label>
            <label>Steps that reproduce the problem<textarea name="stepsToReproduce" required minLength={10} maxLength={4000} placeholder="1. I opened… 2. I selected… 3. The page showed…"/></label>
            <label>Exact error message <span className="muted">(remove private information)</span><textarea name="errorMessage" maxLength={3000} placeholder="Copy the message exactly. Do not paste passwords, codes, keys, bank information, or ID numbers."/></label>
            <div className="two">
              <label>Browser and device <span className="muted">(optional)</span><input name="browserDevice" placeholder="Chrome on iPhone, Safari on Mac…"/></label>
              <label>When it last worked <span className="muted">(optional)</span><input name="lastWorkingAt" type="datetime-local"/></label>
            </div>
            <label><FileImage/> Optional screenshot or safe document
              <input name="screenshot" type="file" accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,image/png,image/jpeg,image/webp,application/pdf,text/plain"/>
              <small className="muted">Maximum 5 MB. Remove passwords, codes, private API keys, bank information, Social Security numbers, and unredacted IDs.</small>
            </label>
            <fieldset>
              <legend>Required permissions</legend>
              <label className="check"><input type="checkbox" name="authorizeDiagnostics" required/><span>I authorize EFF to run safe, read-only checks on the selected public platform and review the account record needed for this ticket.</span></label>
              <label className="check"><input type="checkbox" name="privacyConsent" required/><span>I have not included passwords, verification codes, private API keys, full bank details, Social Security numbers, or unredacted identity documents.</span></label>
              <label className="check"><input type="checkbox" name="accuracyCertified" required/><span>I certify that the ticket information is accurate and belongs to me or I am authorized to submit it.</span></label>
            </fieldset>
            <button className="button"><ShieldCheck/> Submit and Verify My Ticket</button>
          </form>
        </section>
        <aside className="tech-desk-aside">
          <LockKeyhole/>
          <h2>Before you submit</h2>
          <p>Use one ticket per technical problem. Duplicate tickets slow diagnosis and can split the history.</p>
          <div className="danger"><strong>Never send:</strong><p>Passwords, one-time codes, private API keys, service-role keys, Social Security numbers, full bank details, tax returns, or unredacted identity documents.</p></div>
          <strong>Not a technical problem?</strong>
          <p>For financial aid, balances, housing, enrollment, advocacy, or student resources, use the National Student Help Desk.</p>
          <Link className="button outline" href="/help-desk">Go to the National Student Help Desk</Link>
          <Link href="/tech-desk/status">Check EFF Platform Status</Link>
          <Link href="/tech-desk/knowledge">Review the Tech Help Library</Link>
        </aside>
      </div>
    </main>
  );
}
