import Link from "next/link";
import {Award, BookOpenCheck, CheckCircle2, Headphones, LockKeyhole, ShieldCheck} from "lucide-react";
import {getHelpDeskUser} from "@/lib/help-desk/auth";
import {beginVolunteerTraining} from "./actions";

export default async function HelpDeskVolunteerOnboarding({searchParams}:{searchParams:Promise<{error?:string;access?:string}>}) {
  const query = await searchParams;
  const {user, profile} = await getHelpDeskUser();
  const name = String(user?.user_metadata?.preferred_name || user?.user_metadata?.legal_name || "");
  return <main className="section help-desk-volunteer-page"><div className="shell">
    <Link className="card-link" href="/help-desk">← National Help Desk</Link>
    <div className="section-head"><div><div className="eyebrow">Volunteer onboarding</div><h1>Serve students with skill, warmth, and strong boundaries.</h1><p className="lead">Learn EFF’s resources, pass every safety and navigation question, then choose short availability periods when you can actively respond.</p></div><Headphones className="help-desk-title-icon"/></div>
    {query.access==="revoked"&&<div className="notice error-text">Your National Help Desk access is not active. The National Office must review access questions.</div>}
    {profile?.training_score===100&&profile.status!=="revoked"?<div className="card help-desk-ready-card"><CheckCircle2/><div><h2>Your volunteer console is unlocked.</h2><p>You completed training with 100%. Continue serving under the EFF privacy, safety, and relationship standards.</p><div className="hero-actions"><Link className="button" href="/help-desk/volunteer/desk">Open volunteer desk</Link><Link className="button outline" href="/help-desk/volunteer/certificate">Download certificate</Link></div></div></div>:<>
      <div className="cards help-desk-feature-grid">
        <article className="card"><BookOpenCheck/><h3>10 training modules</h3><p>Relationships, EFF resources, FAFSA, balances, housing, scholarships, safety, escalation, desk workflow, and service quality.</p></article>
        <article className="card"><ShieldCheck/><h3>100% required</h3><p>Every safety, privacy, resource, and escalation question must be correct. Review and retake are allowed.</p></article>
        <article className="card"><LockKeyhole/><h3>Secure console</h3><p>Student stories stay inside the Help Desk. Personal text, social accounts, email, and screenshots are prohibited.</p></article>
        <article className="card"><Award/><h3>Professional certificate</h3><p>Passing volunteers receive an EFF National Help Desk Volunteer course-completion certificate.</p></article>
      </div>
      {!user?<div className="card help-desk-onboarding-card"><h2>Create or use your EFF portal account.</h2><p>Your training, certificate, access, shifts, and service record must stay connected to one verified account.</p><div className="hero-actions"><Link className="button" href="/sign-up?next=/help-desk/volunteer">Create account</Link><Link className="button outline" href="/sign-in?next=/help-desk/volunteer">Sign in</Link></div></div>:<form action={beginVolunteerTraining} className="card application-form help-desk-onboarding-card">
        <h2>Volunteer agreement</h2>{query.error&&<div className="notice error-text">Read and accept the full agreement before continuing.</div>}
        <label>Name shown to students and on certificate<input name="displayName" required minLength={2} maxLength={100} defaultValue={profile?.display_name||name}/></label>
        <label className="check"><input type="checkbox" name="agreement" required/><span>I will keep student communication inside the secure Help Desk; protect student information; never promise funding or outcomes; never act as a therapist, attorney, financial-aid administrator, or EFF decisionmaker; follow crisis and escalation rules; document honestly; and accept EFF supervision, transcript review, pause, reassignment, or revocation.</span></label>
        <button className="button">Accept and begin training</button>
      </form>}
    </>}
  </div></main>;
}
