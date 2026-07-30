import type {Metadata} from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  History,
  LifeBuoy,
  Link2,
  MessageCircle,
  ShieldCheck,
  Users,
} from "lucide-react";
import {createHash} from "node:crypto";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";
import {normalizeHelpDeskCaseNumber} from "@/lib/help-desk-context";
import {
  connectCaseToIdentity,
  sendStudentCaseMessage,
} from "@/app/help-desk/actions";

export const metadata: Metadata = {title: "My National Help Desk Case"};

type Query = {access?: string; connected?: string; message?: string};

export default async function HelpDeskCase({
  params,
  searchParams,
}: {
  params: Promise<{caseNumber: string}>;
  searchParams: Promise<Query>;
}) {
  const {caseNumber: rawCaseNumber} = await params;
  const query = await searchParams;
  const caseNumber = normalizeHelpDeskCaseNumber(rawCaseNumber);
  const access = query.access ?? "";
  const admin = createAdminClient();
  const {data: record} = caseNumber
    ? await admin
        .from("student_help_cases")
        .select("*")
        .eq("case_code", caseNumber)
        .maybeSingle()
    : {data: null};
  const hash = access
    ? createHash("sha256").update(access).digest("hex")
    : "";
  const {data: token} = record && hash
    ? await admin
        .from("help_desk_case_access_tokens")
        .select("id,expires_at")
        .eq("case_id", record.id)
        .eq("token_hash", hash)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle()
    : {data: null};

  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();
  const linkedAccess = Boolean(record?.user_id && user?.id === record.user_id);
  if (!record || (!token && !linkedAccess)) {
    return (
      <main className="section white">
        <div className="shell help-desk-expired">
          <Clock3/>
          <div className="eyebrow">Secure access required</div>
          <h1>Your Help Desk Access Link Has Expired</h1>
          <p>For your privacy, secure case links are time-limited. Request a new link using your case number and verified email.</p>
          <div className="hero-actions">
            <Link className="button" href={`/help-desk/access?expired=1&caseNumber=${encodeURIComponent(caseNumber)}`}>Send a New Secure Link</Link>
            <Link className="button outline" href="/help-desk/open-case">Open a New Case</Link>
            <Link className="button outline" href="/help-desk/account-help">Contact Help Desk Account Support</Link>
          </div>
        </div>
      </main>
    );
  }

  if (token) {
    await admin
      .from("help_desk_case_access_tokens")
      .update({last_used_at: new Date().toISOString()})
      .eq("id", token.id);
  }

  const [{data: messages}, {data: resources}, {data: events}] = await Promise.all([
    admin
      .from("student_help_case_messages")
      .select("id,author_type,author_name,body,created_at")
      .eq("case_id", record.id)
      .eq("internal_only", false)
      .order("created_at"),
    admin
      .from("student_help_case_resources")
      .select("id,title,description,url,created_at")
      .eq("case_id", record.id)
      .order("created_at", {ascending: false}),
    admin
      .from("student_help_case_events")
      .select("id,event_type,summary,created_at")
      .eq("case_id", record.id)
      .order("created_at", {ascending: false})
      .limit(30),
  ]);

  const status = record.status.replaceAll("_", " ");
  return (
    <main className="help-desk-case-page">
      <section className="help-desk-case-hero">
        <div className="shell">
          <div>
            <div className="eyebrow">My Help Desk Case</div>
            <h1>{record.preferred_name || record.student_name}, your next step is still in motion.</h1>
            <p>Case <strong>{record.case_code}</strong> · {record.school_name}</p>
          </div>
          <div className="help-desk-case-status"><CheckCircle2/><span>Status</span><strong>{status}</strong></div>
        </div>
      </section>
      <nav className="help-desk-case-nav shell" aria-label="Student case">
        <a href="#messages">Secure Messages</a>
        <a href="#resources">Resources</a>
        <a href="#next-steps">My Next Steps</a>
        <a href="#documents">Documents</a>
        <a href="#history">Case History</a>
        <a href="mailto:nationals@estherfundsinc.org?subject=Help%20Desk%20Case%20Concern">Report a Concern</a>
      </nav>
      <div className="shell help-desk-case-grid">
        <div>
          {query.connected && <div className="notice"><Link2/>This case is now connected to your verified EFF identity. It remains separate from scholarship applications.</div>}
          {query.message && <div className="notice" role="status"><CheckCircle2/>Your secure message was added to the case.</div>}
          <section className="card" id="messages">
            <div className="section-head"><div><div className="eyebrow">Secure conversation</div><h2>Messages</h2></div><MessageCircle/></div>
            <div className="help-desk-message-list">
              {(messages ?? []).length ? messages!.map((message) => (
                <article className={`help-desk-message ${message.author_type}`} key={message.id}>
                  <div><strong>{message.author_name}</strong><small>{new Date(message.created_at).toLocaleString()}</small></div>
                  <p>{message.body}</p>
                </article>
              )) : <p className="muted">Your support team has not added a secure message yet. You can add an update below.</p>}
            </div>
            {access ? (
              <form action={sendStudentCaseMessage} className="stack">
                <input type="hidden" name="caseNumber" value={record.case_code}/>
                <input type="hidden" name="access" value={access}/>
                <label>Add a secure case update<textarea name="body" required minLength={2} maxLength={6000} placeholder="Share what changed, a new deadline, or the response you received. Do not include passwords, Social Security numbers, tax records, bank details, verification codes, or unredacted IDs."/></label>
                <button className="button">Send Secure Update <ArrowRight size={16}/></button>
              </form>
            ) : <p className="notice">To add a message, request a fresh secure link from <Link href="/help-desk/access">Access My Case</Link>.</p>}
          </section>
          <section className="card" id="resources">
            <div className="section-head"><div><div className="eyebrow">Prepared for this case</div><h2>Resources</h2></div><LifeBuoy/></div>
            {(resources ?? []).length ? <div className="help-desk-resource-list">{resources!.map(resource => <article key={resource.id}><strong>{resource.title}</strong><p>{resource.description}</p>{resource.url&&<a className="card-link" href={resource.url} target="_blank" rel="noreferrer">Open official resource →</a>}</article>)}</div> : <p className="muted">Your support team is reviewing the best official resources for this case.</p>}
          </section>
          <section className="card" id="history">
            <div className="section-head"><div><div className="eyebrow">Accountable follow-up</div><h2>Case History</h2></div><History/></div>
            <ol className="help-desk-history">{(events ?? []).map(event=><li key={event.id}><span></span><div><strong>{event.summary}</strong><small>{new Date(event.created_at).toLocaleString()}</small></div></li>)}</ol>
          </section>
        </div>
        <aside>
          <section className="card" id="next-steps">
            <Users/><h3>My Next Steps</h3>
            <ol>
              <li>Watch this secure case for Help Desk updates.</li>
              <li>Keep the school deadline and official case number current.</li>
              <li>Use the school’s secure upload process for requested records.</li>
              <li>Tell the Help Desk what changed after each contact.</li>
            </ol>
          </section>
          <section className="card" id="documents">
            <FileText/><h3>Documents I Reported Having</h3>
            <ul>{(record.documents_available ?? []).map((document: string)=><li key={document}>{document}</li>)}</ul>
            <p className="muted">This list does not mean the documents were uploaded. Do not send sensitive records by ordinary email.</p>
          </section>
          <section className="card">
            <ShieldCheck/><h3>Connect this case to my EFF identity</h3>
            {linkedAccess ? <p>This case is already connected. It remains inside the National Student Help Desk.</p> : user?.email?.toLowerCase() === record.email.toLowerCase() && access ? <form action={connectCaseToIdentity}><input type="hidden" name="caseNumber" value={record.case_code}/><input type="hidden" name="access" value={access}/><p>Optional: connect this case to your existing verified EFF identity for easier access without creating a duplicate account.</p><button className="button outline">Connect My Existing EFF Identity</button></form> : <p>Optional: sign in with the same verified email, then return through your secure case link to connect this case. You will not be sent to a scholarship application.</p>}
          </section>
        </aside>
      </div>
    </main>
  );
}
