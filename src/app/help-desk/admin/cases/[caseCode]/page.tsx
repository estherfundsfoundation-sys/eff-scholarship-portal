import Link from "next/link";
import {notFound} from "next/navigation";
import {addStaffCaseMessage, updateHelpDeskCaseStatus} from "@/app/help-desk/actions";
import {normalizeHelpDeskCaseNumber} from "@/lib/help-desk-context";
import {requireHelpDeskStaff} from "@/lib/help-desk-server";
import {createAdminClient} from "@/lib/supabase/admin";

const money = (value: number | null) => value === null ? "Not provided" : `$${Number(value).toLocaleString()}`;

export default async function HelpDeskCaseDetail({params}:{params:Promise<{caseCode:string}>}) {
  await requireHelpDeskStaff();
  const requested = normalizeHelpDeskCaseNumber((await params).caseCode);
  if (!requested) notFound();
  const admin = createAdminClient();
  const {data: record} = await admin.from("student_help_cases").select("*").eq("case_code", requested).maybeSingle();
  if (!record) notFound();
  const [{data: messages}, {data: resources}, {data: events}] = await Promise.all([
    admin.from("student_help_case_messages").select("id,author_type,author_name,body,internal_only,created_at").eq("case_id", record.id).order("created_at"),
    admin.from("student_help_case_resources").select("id,title,description,url,created_at").eq("case_id", record.id).order("created_at"),
    admin.from("student_help_case_events").select("id,event_type,summary,created_at").eq("case_id", record.id).order("created_at", {ascending:false}).limit(100),
  ]);
  return <main className="section white"><div className="shell" style={{maxWidth:960}}>
    <Link className="card-link" href="/help-desk/admin">← Help Desk Administration</Link>
    <div className="eyebrow">Restricted case workspace</div>
    <h1>{record.case_code}</h1>
    <p><strong>{record.preferred_name || record.student_name}</strong> · {record.school_name} · {record.issue_type}</p>
    <div className="stats admin-stats">
      <div className="stat"><strong>{record.status.replaceAll("_", " ")}</strong><span>Status</span></div>
      <div className="stat"><strong>{record.urgency}</strong><span>Urgency</span></div>
      <div className="stat"><strong>{record.school_deadline || "Not provided"}</strong><span>School deadline</span></div>
      <div className="stat"><strong>{money(record.amount_at_risk)}</strong><span>Amount at risk</span></div>
    </div>
    <div className="admin-columns" style={{marginTop:24}}>
      <section className="card">
        <div className="eyebrow">Student report</div><h2>What is happening</h2>
        <p>{record.situation_summary}</p>
        <h3>Steps already taken</h3><p>{record.steps_taken}</p>
        <p><strong>School department sought:</strong> {record.department_sought || "Not provided"}</p>
        <p><strong>Documents available:</strong> {Array.isArray(record.documents_available) && record.documents_available.length ? record.documents_available.join(", ") : "None listed"}</p>
        <p><strong>EFF may contact school:</strong> {record.authorize_eff_contact ? "Yes" : "No"}</p>
      </section>
      <section className="card">
        <div className="eyebrow">Case control</div><h2>Update routing</h2>
        <form action={updateHelpDeskCaseStatus} className="stack">
          <input type="hidden" name="caseId" value={record.id}/>
          <label>Status<select name="status" defaultValue={record.status}>{["new","reviewing","waiting_on_student","referred_to_school","follow_up_due","resolved","closed"].map(status=><option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label>
          <label>Next follow-up<input name="nextFollowUpAt" type="datetime-local"/></label>
          <label>Private staff note<textarea name="staffNote" rows={5} defaultValue={record.staff_note || ""} maxLength={4000}/></label>
          <button className="button">Save case status</button>
        </form>
      </section>
    </div>
    <section className="card" style={{marginTop:24}}>
      <div className="eyebrow">Secure conversation</div><h2>Student and Help Desk messages</h2>
      {(messages ?? []).length ? messages!.map(message=><article className="notice" key={message.id} style={{marginTop:12}}><strong>{message.author_name} · {message.author_type.replaceAll("_", " ")}</strong>{message.internal_only&&<small> · internal only</small>}<p style={{whiteSpace:"pre-wrap"}}>{message.body}</p><small>{new Date(message.created_at).toLocaleString()}</small></article>) : <p className="muted">No secure messages have been added.</p>}
      <form action={addStaffCaseMessage} className="stack" style={{marginTop:18}}><input type="hidden" name="caseId" value={record.id}/><label>Add a secure student-facing update<textarea name="body" required minLength={2} maxLength={6000} rows={7}/></label><button className="button">Add to Secure Case</button></form>
    </section>
    <div className="admin-columns" style={{marginTop:24}}>
      <section className="card"><h2>Shared resources</h2>{(resources ?? []).length ? resources!.map(resource=><article key={resource.id}><strong>{resource.title}</strong><p>{resource.description}</p>{resource.url&&<a href={resource.url} target="_blank" rel="noreferrer">Open official resource</a>}</article>) : <p className="muted">No resources have been added.</p>}</section>
      <section className="card"><h2>Case events</h2>{(events ?? []).length ? <ol>{events!.map(event=><li key={event.id}><strong>{event.event_type.replaceAll("_", " ")}</strong><p>{event.summary}</p><small>{new Date(event.created_at).toLocaleString()}</small></li>)}</ol> : <p className="muted">No case events recorded.</p>}</section>
    </div>
  </div></main>;
}
