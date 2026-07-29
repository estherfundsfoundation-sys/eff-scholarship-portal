import Link from "next/link";
import {notFound} from "next/navigation";
import {AlertTriangle, LockKeyhole, ShieldCheck} from "lucide-react";
import {createAdminClient} from "@/lib/supabase/admin";
import {verifyHelpDeskToken} from "@/lib/help-desk/tokens";
import {HelpDeskChatPanel} from "../../chat-panel";

export const dynamic = "force-dynamic";

export default async function StudentSecureCase({
  params,searchParams,
}:{
  params:Promise<{caseCode:string}>;
  searchParams:Promise<{token?:string}>;
}) {
  const [{caseCode},{token}] = await Promise.all([params,searchParams]);
  const verified = token ? verifyHelpDeskToken(token) : null;
  if (!verified) notFound();
  const admin = createAdminClient();
  const {data: conversation} = await admin.from("help_desk_conversations")
    .select("id,status,risk_level,case_id,student_help_cases(case_code,preferred_name,student_name,school_name,issue_type,urgency,school_deadline)")
    .eq("case_id",verified.caseId).eq("access_token_hash",verified.tokenHash).maybeSingle();
  const record = Array.isArray(conversation?.student_help_cases) ? conversation.student_help_cases[0] : conversation?.student_help_cases;
  if (!conversation || !record || record.case_code.toUpperCase()!==caseCode.toUpperCase()) notFound();
  const name = record.preferred_name || record.student_name;
  const endpoint = `/api/help-desk/case/${encodeURIComponent(record.case_code)}/messages?token=${encodeURIComponent(token!)}`;
  return <main className="section help-desk-case-page"><div className="shell help-desk-case-shell">
    <Link className="card-link" href="/help-desk">← National Help Desk</Link>
    <header className="help-desk-case-header"><div><div className="eyebrow">Private EFF case · {record.case_code}</div><h1>Welcome back, {name}.</h1><p>Your full conversation stays here so any assigned trained volunteer can understand what happened before replying.</p></div><LockKeyhole/></header>
    <div className="help-desk-case-grid"><section>
      <div className="help-desk-case-facts"><span><strong>School</strong>{record.school_name}</span><span><strong>Topic</strong>{record.issue_type}</span><span><strong>Urgency</strong>{record.urgency}</span><span><strong>Deadline</strong>{record.school_deadline||"Not provided"}</span></div>
      <HelpDeskChatPanel endpoint={endpoint} role="student" initialStatus={conversation.status}/>
    </section><aside className="help-desk-case-aside"><div className="card"><ShieldCheck/><h2>Protect your information</h2><p>Never send a Social Security number, password, verification code, tax return, full bank details, medical record, or unredacted identity document. EFF will provide secure instructions if an authorized reviewer truly needs a record.</p></div><div className="card"><AlertTriangle/><h2>Do not wait in an emergency</h2><p>Call 911 for immediate danger. Call or text 988 for suicide, self-harm, emotional distress, or mental-health crisis support. Dial 211 for local food, shelter, and essentials.</p></div></aside></div>
  </div></main>;
}
