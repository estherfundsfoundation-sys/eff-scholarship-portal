import type {Metadata} from "next";
import Link from "next/link";
import {
  BadgeCheck,Building2,CheckCircle2,Clock3,Copy,ExternalLink,
  FileText,HeartHandshake,LockKeyhole,ShieldCheck,Users
} from "lucide-react";
import {redirect} from "next/navigation";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";
import {signOut} from "@/app/auth/actions";
import {updatePartnerProfile} from "../actions";

export const metadata:Metadata={title:"Partner Institution Portal"};

const statusCopy:Record<string,[string,string]>={
  draft:["Draft","Complete the application before EFF can review the institution."],
  pending:["Verification in progress","EFF is reviewing the representative, institution, and Continuity Pledge."],
  approved:["Approved partner","The partnership is approved. EFF is preparing the public launch."],
  active:["Active partner","Your institution is publicly recognized as an Every Future Fulfilled partner."],
  paused:["Partnership paused","The public profile is temporarily paused while EFF and the institution review next steps."],
  declined:["Application not approved","Contact the EFF national office if the institution would like clarification or reconsideration."]
};

export default async function PartnerDashboard({searchParams}:{searchParams:Promise<{submitted?:string;saved?:string;error?:string}>}){
  const query=await searchParams;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/sign-in?next=%2Fpartners%2Fdashboard");
  const admin=createAdminClient();
  const {data:membership}=await admin.from("eff_partner_members")
    .select("institution_id,member_role").eq("user_id",user.id).maybeSingle();
  if(!membership)redirect("/partners/onboarding");
  const {data:institution}=await admin.from("eff_partner_institutions")
    .select("*").eq("id",membership.institution_id).single();
  if(!institution)redirect("/partners/onboarding");
  const [statusLabel,statusDescription]=statusCopy[institution.status]??["Under review","EFF is reviewing this partnership."];
  const referralUrl="https://portal.estherfundsfoundation.org/resources/student-help";
  const readiness=[
    [Boolean(institution.primary_contact_email),"Authorized representative identified"],
    [Boolean(institution.liaison_department),"Campus liaison department named"],
    [Boolean(institution.logo_url),"Official logo supplied"],
    [Boolean(institution.public_summary),"Public continuity commitment written"],
    [institution.status==="approved"||institution.status==="active","Institution verified by EFF"],
    [institution.public_profile&&institution.status==="active","Public partner profile launched"]
  ] as const;
  const complete=readiness.filter(item=>item[0]).length;
  return <main className="partner-dashboard-page">
    <section className="partner-dashboard-header"><div className="shell">
      <div><div className="eyebrow">Institution partner portal</div><h1>{institution.display_name}</h1><p>Manage the free EFF partnership profile, readiness steps, and student referral pathway.</p></div>
      <form action={signOut}><button className="button outline">Sign out</button></form>
    </div></section>
    <section className="section"><div className="shell">
      {query.submitted&&<div className="notice success-text"><CheckCircle2/>Partnership application submitted. EFF will verify the institution before it appears publicly.</div>}
      {query.saved&&<div className="notice success-text"><CheckCircle2/>Partner profile saved.</div>}
      {query.error&&<div className="notice error-text">{query.error}</div>}
      <div className="partner-dashboard-grid">
        <section className="partner-status-card">
          <div className={`partner-status-badge status-${institution.status}`}>{institution.status==="active"?<BadgeCheck/>:<Clock3/>}{statusLabel}</div>
          <h2>{statusDescription}</h2>
          <p>Account role: <strong>{membership.member_role}</strong></p>
          <div className="partner-readiness"><div><span>Partner readiness</span><strong>{complete} of {readiness.length}</strong></div><progress value={complete} max={readiness.length}/></div>
          <div className="partner-checklist">{readiness.map(([done,label])=><div className={done?"done":""} key={label}>{done?<CheckCircle2/>:<span/>}{label}</div>)}</div>
          {institution.public_profile&&<Link className="button" href={`/partners/${institution.slug}`}>View public profile <ExternalLink size={16}/></Link>}
        </section>

        <section className="partner-referral-card">
          <HeartHandshake/>
          <div className="eyebrow">Student referral pathway</div>
          <h2>Give students one place to start.</h2>
          <p>Share this Help Desk link with students whose education is threatened by a financial, enrollment, housing, document, or basic-needs barrier.</p>
          <div className="partner-copy-link"><code>{referralUrl}</code><Copy size={18}/></div>
          <Link className="button" href="/resources/student-help">Open the Student Help Desk</Link>
          <small>Students control their own cases. EFF contacts the institution only with appropriate student authorization. Partner status never guarantees funding, reinstatement, or a particular decision.</small>
        </section>
      </div>

      <div className="partner-dashboard-grid second">
        <section className="card">
          <div className="card-icon"><Users/></div><h3>Case collaboration is consent-based</h3>
          <p>Institution accounts do not automatically expose private student cases. EFF will invite the appropriate liaison into case-specific communication only when the student has authorized it and the information is necessary.</p>
          <div className="notice"><LockKeyhole/><span>No student passwords, Social Security numbers, tax records, banking credentials, or unnecessary protected records should be exchanged through ordinary email.</span></div>
        </section>
        <section className="card">
          <div className="card-icon"><FileText/></div><h3>Partner launch materials</h3>
          <p>After approval, EFF will provide language for student-success teams, a referral notice, a website badge, and guidance for introducing the partnership internally.</p>
          <ul>
            <li>Campus liaison launch checklist</li>
            <li>Student referral language</li>
            <li>Continuity Pledge summary</li>
            <li>Public partner profile and logo placement</li>
          </ul>
        </section>
      </div>

      <section className="partner-profile-editor">
        <div><div className="eyebrow">Institution profile</div><h2>Keep the partnership information current.</h2><p>EFF may re-verify official links and logo ownership before public display.</p></div>
        <form action={updatePartnerProfile} className="application-form">
          <input type="hidden" name="institutionId" value={institution.id}/>
          <div className="form-grid">
            <label>Representative name<input name="primaryContactName" defaultValue={institution.primary_contact_name} required/></label>
            <label>Representative title<input name="primaryContactTitle" defaultValue={institution.primary_contact_title} required/></label>
            <label>Direct phone <span className="optional">private</span><input name="primaryContactPhone" defaultValue={institution.primary_contact_phone??""}/></label>
            <label>Liaison department<input name="liaisonDepartment" defaultValue={institution.liaison_department} required/></label>
            <label className="full-field">Official website<input type="url" name="websiteUrl" defaultValue={institution.website_url??""} required/></label>
            <label className="full-field">Official logo URL<input type="url" name="logoUrl" defaultValue={institution.logo_url??""} placeholder="https://www.college.edu/logo.png"/></label>
            <label className="full-field">Public partnership summary<textarea name="publicSummary" defaultValue={institution.public_summary??""} minLength={80} maxLength={900} required/></label>
          </div>
          <button className="button">Save institution profile</button>
        </form>
      </section>

      <section className="partner-account-safety"><ShieldCheck/><div><strong>Free means free.</strong><p>EFF does not charge institutions to apply, maintain a partner account, appear in the directory, or refer students. Future optional sponsored initiatives must be disclosed separately and cannot change the availability of this core partnership.</p></div><Building2/></section>
    </div></section>
  </main>;
}
