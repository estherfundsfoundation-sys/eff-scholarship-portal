import type {Metadata} from "next";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  CalendarClock,
  Clock3,
  FileCheck2,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  addStaffCaseMessage,
  signOutHelpDesk,
  updateVolunteerStatus,
} from "@/app/help-desk/actions";
import {requireHelpDeskStaff} from "@/lib/help-desk-server";
import {createAdminClient} from "@/lib/supabase/admin";

export const metadata: Metadata = {title: "Help Desk Administration"};

export default async function HelpDeskAdmin() {
  const {user, roles} = await requireHelpDeskStaff();
  const admin = createAdminClient();
  const [
    {data: cases},
    {data: volunteers},
    {data: shifts},
    {data: hours},
    {data: safety},
    {data: quality},
  ] = await Promise.all([
    admin.from("student_help_cases").select("id,case_code,student_name,preferred_name,email,school_name,issue_type,urgency,status,assigned_volunteer_id,last_student_message_at,last_team_message_at,created_at,updated_at").not("verified_at","is",null).order("updated_at",{ascending:false}).limit(250),
    admin.from("help_desk_volunteer_profiles").select("user_id,legal_name,preferred_name,email,status,onboarding_step,training_score,training_completed_at,approved_at,created_at").order("created_at",{ascending:false}).limit(250),
    admin.from("help_desk_shifts").select("id,volunteer_id,starts_at,ends_at,status").gte("ends_at",new Date(Date.now()-24*60*60*1000).toISOString()).order("starts_at").limit(100),
    admin.from("help_desk_service_hours").select("id,volunteer_id,minutes,status,description,created_at").order("created_at",{ascending:false}).limit(200),
    admin.from("help_desk_safety_escalations").select("id,case_id,severity,summary,status,created_at").neq("status","resolved").order("created_at",{ascending:false}).limit(100),
    admin.from("help_desk_quality_reviews").select("id,case_id,score,status,findings,created_at").neq("status","resolved").order("created_at",{ascending:false}).limit(100),
  ]);
  const waiting=(cases??[]).filter(row=>!["resolved","closed"].includes(row.status));
  const unassigned=waiting.filter(row=>!row.assigned_volunteer_id);
  const activeVolunteers=(volunteers??[]).filter(row=>row.status==="active");
  const awaitingApproval=(volunteers??[]).filter(row=>row.status==="awaiting_approval");
  const pendingHours=(hours??[]).filter(row=>row.status==="pending");

  return <main className="section white help-desk-admin-page"><div className="shell"><div className="help-desk-console-head"><div><div className="eyebrow">Restricted National Student Help Desk workspace</div><h1>Help Desk Administration</h1><p>Cases, volunteers, live operations, safety, quality, resources, service hours, and accountable follow-up—separate from scholarship administration.</p><small>Signed in as {user.email} · {roles.join(", ").replaceAll("_"," ")}</small></div><div className="hero-actions"><Link className="button outline" href="/admin">Scholarship Administration</Link><form action={signOutHelpDesk}><input type="hidden" name="context" value="staff"/><button className="button outline">Sign Out</button></form></div></div><nav className="help-desk-admin-nav" aria-label="Help Desk administration"><a href="#operations">Operations</a><a href="#cases">Cases</a><a href="#escalations">Escalations</a><a href="#volunteers">Volunteers</a><a href="#shifts">Shifts</a><a href="#training">Training</a><a href="#hours">Service Hours</a><a href="#quality">Quality Reviews</a><Link href="/help-desk/resources">Resources</Link><a href="#analytics">Analytics</a><a href="#audit">Audit Log</a></nav><section className="help-desk-admin-stats" id="operations"><article><MessageCircle/><strong>{waiting.length}</strong><span>waiting or active cases</span></article><article><Clock3/><strong>{unassigned.length}</strong><span>unassigned cases</span></article><article><Users/><strong>{activeVolunteers.length}</strong><span>active volunteers</span></article><article><ShieldAlert/><strong>{safety?.length??0}</strong><span>open safety escalations</span></article><article><FileCheck2/><strong>{pendingHours.length}</strong><span>service records to verify</span></article><article><BarChart3/><strong>{quality?.length??0}</strong><span>open quality reviews</span></article></section>
    <section className="card" id="cases"><div className="section-head"><div><div className="eyebrow">Live operations</div><h2>Cases</h2></div><MessageCircle/></div><div className="table-wrap"><table><thead><tr><th>Case</th><th>Barrier</th><th>Urgency</th><th>Status</th><th>Latest activity</th><th>Secure update</th></tr></thead><tbody>{(cases??[]).map(row=><tr key={row.id}><td><strong>{row.case_code}</strong><br/><small>{row.student_name}<br/>{row.school_name}</small></td><td>{row.issue_type}</td><td>{row.urgency}</td><td><span className="status">{row.status.replaceAll("_"," ")}</span>{!row.assigned_volunteer_id&&<small><br/>Unassigned</small>}</td><td>{new Date(row.updated_at).toLocaleString()}</td><td><details><summary>Message</summary><form action={addStaffCaseMessage} className="stack"><input type="hidden" name="caseId" value={row.id}/><textarea name="body" required minLength={2} maxLength={6000} placeholder="A warm, specific, action-oriented Help Desk update. Do not include scholarship decisions or private staff notes."/><button className="button outline">Add to Secure Case</button></form></details></td></tr>)}</tbody></table></div></section>
    <div className="help-desk-admin-columns"><section className="card" id="escalations"><ShieldAlert/><h2>Safety Escalations</h2>{safety?.length?safety.map(item=><article className="notice error-text" key={item.id}><strong>{item.severity.toUpperCase()} · {item.status}</strong><p>{item.summary}</p><small>{new Date(item.created_at).toLocaleString()}</small></article>):<p className="muted">No open safety escalations.</p>}</section><section className="card" id="quality"><ShieldCheck/><h2>Quality Reviews</h2>{quality?.length?quality.map(item=><article className="notice" key={item.id}><strong>{item.status.replaceAll("_"," ")} · {item.score??"not scored"}</strong><p>{item.findings||"Review pending."}</p></article>):<p className="muted">No open quality reviews.</p>}</section></div>
    <section className="card" id="volunteers"><div className="section-head"><div><div className="eyebrow">People and readiness</div><h2>Volunteers</h2></div><Users/></div><div className="table-wrap"><table><thead><tr><th>Volunteer</th><th>Training</th><th>Status</th><th>Access decision</th></tr></thead><tbody>{(volunteers??[]).map(row=><tr key={row.user_id}><td><strong>{row.preferred_name||row.legal_name}</strong><br/><small>{row.email}</small></td><td>{row.training_score??0}%<br/><small>{row.onboarding_step.replaceAll("_"," ")}</small></td><td><span className="status">{row.status.replaceAll("_"," ")}</span></td><td><form action={updateVolunteerStatus} className="stack"><input type="hidden" name="volunteerId" value={row.user_id}/><select name="status" defaultValue={row.status}>{["awaiting_approval","active","recertification_required","suspended","revoked"].map(status=><option value={status} key={status}>{status.replaceAll("_"," ")}</option>)}</select><button className="button outline">Save Help Desk Status</button></form></td></tr>)}</tbody></table></div></section>
    <div className="help-desk-admin-columns"><section className="card" id="shifts"><CalendarClock/><h2>Shift Coverage</h2><p><strong>{shifts?.filter(row=>row.status==="scheduled").length??0}</strong> scheduled shifts · <strong>{shifts?.filter(row=>row.status==="checked_in").length??0}</strong> checked in</p></section><section className="card" id="training"><BookOpenCheck/><h2>Training</h2><p><strong>{awaitingApproval.length}</strong> volunteers completed training and await approval. 100% is required before activation.</p></section><section className="card" id="hours"><FileCheck2/><h2>Service Hours</h2><p><strong>{pendingHours.length}</strong> service records await verification. Hours are not verified until authorized staff review them.</p></section></div>
    <section className="card" id="analytics"><BarChart3/><h2>Help Desk Analytics</h2><div className="help-desk-metric-grid"><div><strong>{cases?.length??0}</strong><span>verified cases in view</span></div><div><strong>{waiting.length?Math.round(unassigned.length/waiting.length*100):0}%</strong><span>currently unassigned</span></div><div><strong>{volunteers?.length??0}</strong><span>volunteer profiles</span></div><div><strong>{hours?.reduce((sum,row)=>sum+(row.status==="verified"?row.minutes:0),0)??0}</strong><span>verified service minutes</span></div></div><p className="muted">Help Desk cases, messages, response time, volunteers, coverage, follow-up, safety, quality, and service hours remain separate from scholarship application analytics.</p></section><section className="notice" id="audit"><AlertTriangle/><div><strong>Data isolation is mandatory.</strong><p>Scholarship roles alone do not grant Help Desk access. Help Desk roles do not grant scholarship application or reviewer access. Cross-system access requires the corresponding role and an approved purpose.</p></div></section></div></main>;
}
