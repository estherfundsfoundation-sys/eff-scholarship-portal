import type {Metadata} from "next";
import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import {
  completeVolunteerModule,
  saveVolunteerApplication,
  submitVolunteerAssessment,
} from "@/app/help-desk/actions";
import {requireHelpDeskVolunteer} from "@/lib/help-desk-server";

export const metadata: Metadata = {title: "Help Desk Volunteer Onboarding"};

const modules = [
  ["listen", "Listen With Dignity", "Acknowledge the student’s concern, identify the requested outcome, and give at least one concrete next step without judgment."],
  ["privacy", "Privacy and Secure Records", "Use only assigned case information. Never request passwords, Social Security numbers, tax returns, banking details, verification codes, or unnecessary medical details."],
  ["boundaries", "Volunteer Scope and Boundaries", "Do not promise funding, decisions, deadlines, legal representation, emergency counseling, or authority EFF has not confirmed."],
  ["routing", "Resource Navigation and Follow-Up", "Use verified official sources, help the student prepare, record the next step, and follow up through the case."],
  ["safety", "Safety Escalation", "Do not provide clinical or emergency counseling. Escalate to authorized staff and use verified local emergency resources only when location is known."],
  ["quality", "Quality, Conduct, and Accountability", "Keep language warm, direct, specific, professional, and action-oriented. Work only assigned cases and accept coaching or review."],
];

type Query = {
  stage?: string;
  error?: string;
  saved?: string;
  score?: string;
  new?: string;
  completed?: string;
};

export default async function VolunteerOnboarding({searchParams}: {searchParams: Promise<Query>}) {
  const query = await searchParams;
  const {admin, user, profile} = await requireHelpDeskVolunteer();
  const {data: progress} = await admin
    .from("help_desk_volunteer_training")
    .select("module_key,completed,score")
    .eq("volunteer_id", user.id);
  const complete = new Set((progress ?? []).filter(item=>item.completed).map(item=>item.module_key));

  if (profile && ["suspended","revoked"].includes(profile.status)) {
    return <main className="section white"><div className="shell help-desk-restricted"><LockKeyhole/><div className="eyebrow">Volunteer access status</div><h1>Volunteer Access Is Not Active Yet</h1><p>Your current National Help Desk volunteer status is <strong>{profile.status}</strong>.</p><p>{profile.access_note || "An authorized Help Desk supervisor can explain whether a review is pending and what next step is available."}</p><div className="hero-actions"><Link className="button" href="/help-desk/account-help#volunteer">Contact Volunteer Support</Link><Link className="button outline" href="/help-desk">Return to National Help Desk</Link></div></div></main>;
  }

  if (profile?.status === "active") {
    return <main className="section white"><div className="shell help-desk-restricted"><BadgeCheck/><div className="eyebrow">Training complete · approved</div><h1>Your Volunteer Access Is Active</h1><p>You earned 100% and have been approved to serve only within your assigned Help Desk role.</p><Link className="button" href="/help-desk/volunteer/console">Open Volunteer Console</Link></div></main>;
  }

  if (profile?.status === "awaiting_approval") {
    return <main className="section white"><div className="shell help-desk-restricted"><Clock3/><div className="eyebrow">Training complete · 100%</div><h1>Your Volunteer Application Is Awaiting Approval</h1><p>EFF received your completed onboarding and assessment. Approval is required before assigned cases, shifts, or student information become available.</p><p>No outcome or approval deadline is promised. Watch your email for a National Help Desk update.</p><Link className="button outline" href="/help-desk/account-help#volunteer">Help With Approval Status</Link></div></main>;
  }

  return <main className="section white"><div className="shell"><div className="section-head"><div><div className="eyebrow">National Help Desk volunteer journey</div><h1>Volunteer Onboarding</h1><p>Application → agreements → six modules → 100% assessment → EFF approval.</p></div><div className="help-desk-training-score"><strong>{profile?.training_score ?? 0}%</strong><span>assessment</span></div></div>{query.error&&<div className="notice error-text"><AlertTriangle/>{query.error}</div>}{query.saved&&<div className="notice"><CheckCircle2/>Application and agreements saved. Your six training modules are ready below.</div>}{query.completed&&<div className="notice"><CheckCircle2/>Module saved. Your progress is recorded.</div>}
    {!profile ? <section className="card help-desk-onboarding-form"><h2>You are signed in, but you have not started National Help Desk volunteer onboarding.</h2><form action={saveVolunteerApplication} className="application-form"><div className="form-grid"><label>Legal name<input name="legalName" required defaultValue={String(user.user_metadata?.legal_name ?? "")}/></label><label>Preferred name<input name="preferredName" defaultValue={String(user.user_metadata?.preferred_name ?? "")}/></label><label>Time zone<select name="timeZone" defaultValue={String(user.user_metadata?.time_zone ?? "America/New_York")}><option value="America/New_York">Eastern</option><option value="America/Chicago">Central</option><option value="America/Denver">Mountain</option><option value="America/Los_Angeles">Pacific</option><option value="America/Anchorage">Alaska</option><option value="Pacific/Honolulu">Hawaii</option></select></label></div><label>Why do you want to serve through the National Help Desk?<textarea name="motivation" required minLength={40}/></label><label>Relevant listening, navigation, education, service, or student-support experience <span className="optional">optional</span><textarea name="experience"/></label><label>Describe your weekly availability<textarea name="availability" required minLength={10}/></label><label className="check"><input type="checkbox" name="agreements" required/><span>I will protect privacy, work only assigned cases, use verified resources, follow escalation rules, avoid promises outside my authority, and follow EFF conduct and quality requirements.</span></label><button className="button">Save Application and Begin Training</button></form></section> : <>
      <div className="help-desk-training-grid">{modules.map(([key,title,body],index)=><article className={`card ${complete.has(key)?"complete":""}`} key={key}><span className="training-number">{String(index+1).padStart(2,"0")}</span>{complete.has(key)?<CheckCircle2/>:<BookOpenCheck/>}<h3>{title}</h3><p>{body}</p><div className="notice"><strong>Practice:</strong> Write one dignified acknowledgement and one concrete next step. If risk or authority is unclear, pause and escalate.</div>{complete.has(key)?<span className="status">Complete · 100%</span>:<form action={completeVolunteerModule}><input type="hidden" name="moduleKey" value={key}/><button className="button outline">Complete Module</button></form>}</article>)}</div>
      <section className="card help-desk-assessment"><div className="section-head"><div><div className="eyebrow">Final knowledge check</div><h2>100% is required.</h2></div><ShieldCheck/></div>{query.score&&<div className="notice error-text"><RotateCcw/>Your score was {query.score}%. Review the modules and retake every question.</div>}<form action={submitVolunteerAssessment} className="stack"><fieldset><legend>A student asks you to promise an emergency grant. What do you do?</legend><label className="check"><input type="radio" name="resource" value="correct" required/><span>Acknowledge the need, explain that funding is not guaranteed, and provide the correct next step.</span></label><label className="check"><input type="radio" name="resource" value="wrong"/><span>Promise approval if the story sounds urgent.</span></label></fieldset><fieldset><legend>Which information belongs in an ordinary Help Desk message?</legend><label className="check"><input type="radio" name="private" value="correct" required/><span>A factual update and school deadline, without passwords, SSNs, banking details, or unnecessary records.</span></label><label className="check"><input type="radio" name="private" value="wrong"/><span>A full tax return and account password.</span></label></fieldset><fieldset><legend>A message indicates immediate safety risk. What is your role?</legend><label className="check"><input type="radio" name="escalate" value="correct" required/><span>Pause ordinary case handling and escalate immediately to authorized Help Desk safety staff.</span></label><label className="check"><input type="radio" name="escalate" value="wrong"/><span>Provide clinical counseling yourself.</span></label></fieldset><fieldset><legend>Which cases may a volunteer open?</legend><label className="check"><input type="radio" name="assigned" value="correct" required/><span>Only assigned Help Desk cases needed for an active shift or approved follow-up.</span></label><label className="check"><input type="radio" name="assigned" value="wrong"/><span>Any scholarship or Help Desk record that seems interesting.</span></label></fieldset><button className="button">Submit 100% Assessment</button></form></section>
    </>}</div></main>;
}
