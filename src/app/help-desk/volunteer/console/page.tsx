import type {Metadata} from "next";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarClock,
  Clock3,
  FileCheck2,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import {
  logVolunteerServiceHours,
  signOutHelpDesk,
} from "@/app/help-desk/actions";
import {requireActiveHelpDeskVolunteer} from "@/lib/help-desk-server";

export const metadata: Metadata = {title: "Help Desk Volunteer Console"};

type Query = {hours?: string; error?: string};

export default async function VolunteerConsole({searchParams}: {searchParams: Promise<Query>}) {
  const query = await searchParams;
  const {admin, user, profile} = await requireActiveHelpDeskVolunteer();
  const [{data: assignments}, {data: shifts}, {data: hours}] = await Promise.all([
    admin.from("student_help_cases").select("id,case_code,school_name,issue_type,status,urgency,updated_at").eq("assigned_volunteer_id", user.id).not("status","in","(resolved,closed)").order("updated_at",{ascending:false}),
    admin.from("help_desk_shifts").select("*").eq("volunteer_id",user.id).order("starts_at",{ascending:true}).limit(20),
    admin.from("help_desk_service_hours").select("*").eq("volunteer_id",user.id).order("created_at",{ascending:false}).limit(50),
  ]);
  const verifiedMinutes=(hours??[]).filter(row=>row.status==="verified").reduce((sum,row)=>sum+row.minutes,0);
  return <main className="section white"><div className="shell"><div className="help-desk-console-head"><div><div className="eyebrow">Approved National Help Desk volunteer</div><h1>Welcome, {profile.preferred_name || profile.legal_name}.</h1><p>Use only assigned cases. Escalate safety, privacy, conduct, or authority questions to a supervisor.</p></div><form action={signOutHelpDesk}><input type="hidden" name="context" value="volunteer"/><button className="button outline">Sign Out of Volunteer</button></form></div>{query.hours&&<div className="notice"><FileCheck2/>Service activity submitted for supervisor verification.</div>}{query.error&&<div className="notice error-text">{query.error}</div>}<nav className="help-desk-case-nav" aria-label="Volunteer console"><a href="#shift">My Shift</a><a href="#cases">Assigned Cases</a><a href="#follow-ups">Follow-Ups</a><Link href="/help-desk/resources">Resource Library</Link><Link href="/help-desk/volunteer/onboarding">Training</Link><a href="#hours">Service Hours</a><a href="#certificate">Certificates</a><Link href="/help-desk/account-help#volunteer">Volunteer Support</Link></nav><div className="stats admin-stats"><div className="stat"><strong>{assignments?.length??0}</strong><span>assigned cases</span></div><div className="stat"><strong>{shifts?.filter(x=>x.status==="scheduled").length??0}</strong><span>upcoming shifts</span></div><div className="stat"><strong>{Math.round(verifiedMinutes/60*10)/10}</strong><span>verified service hours</span></div><div className="stat"><strong>100%</strong><span>training score</span></div></div><div className="help-desk-console-grid"><section className="card" id="cases"><MessageCircle/><h2>Assigned Cases</h2>{assignments?.length?<div className="table-wrap"><table><thead><tr><th>Case</th><th>Issue</th><th>Status</th><th>Updated</th></tr></thead><tbody>{assignments.map(row=><tr key={row.id}><td><strong>{row.case_code}</strong><br/><small>{row.school_name}</small></td><td>{row.issue_type}<br/><small>{row.urgency}</small></td><td>{row.status.replaceAll("_"," ")}</td><td>{new Date(row.updated_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>:<p className="muted">No cases are assigned. Do not open unassigned student records.</p>}</section><aside><section className="card" id="shift"><CalendarClock/><h3>My Shift</h3>{shifts?.length?shifts.map(shift=><p key={shift.id}><strong>{new Date(shift.starts_at).toLocaleString()}</strong><br/>{shift.status.replaceAll("_"," ")}</p>):<p className="muted">No shift is currently scheduled.</p>}</section><section className="card" id="hours"><Clock3/><h3>Record Service Activity</h3><form action={logVolunteerServiceHours} className="stack"><label>Minutes<input type="number" name="minutes" min={1} max={1440} required/></label><label>Work completed<textarea name="description" required minLength={5}/></label><button className="button outline">Submit for Verification</button></form></section><section className="card" id="certificate"><BadgeCheck/><h3>Certificate</h3><p>Training score: 100%. Your active credential remains subject to EFF approval, conduct, privacy, and recertification requirements.</p></section><section className="notice"><ShieldCheck/><strong>Volunteer boundary</strong><p>Never promise funding, school decisions, deadlines, clinical help, or authority EFF has not confirmed. Do not access scholarship applications.</p></section></aside></div></div></main>;
}
