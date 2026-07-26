import type {Metadata} from "next";
import Link from "next/link";
import {CheckCircle2,HeartHandshake,ShieldCheck} from "lucide-react";
import {redirect} from "next/navigation";
import {SchoolSelector} from "@/app/resources/student-help/SchoolSelector";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";
import {submitPartnerApplication} from "../actions";

export const metadata:Metadata={title:"Partner Institution Application"};

export default async function PartnerOnboarding({searchParams}:{searchParams:Promise<{error?:string}>}){
  const {error}=await searchParams;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/sign-in?next=%2Fpartners%2Fonboarding");
  const admin=createAdminClient();
  const {data:existing}=await admin.from("eff_partner_members").select("institution_id")
    .eq("user_id",user.id).maybeSingle();
  if(existing)redirect("/partners/dashboard");
  const {data:profile}=await admin.from("profiles").select("legal_name,primary_email").eq("id",user.id).maybeSingle();
  return <main className="partner-onboarding-page">
    <section className="resource-hero"><div className="shell"><Link className="back-link" href="/partners">← Partnership overview</Link><div className="eyebrow">Step 2 of 2 · Free institution application</div><h1>Build your <span>partner profile.</span></h1><p>Tell EFF who will lead the partnership and confirm the intervention practices your school is prepared to support.</p></div></section>
    <section className="section white"><div className="shell partner-onboarding-layout">
      <aside>
        <HeartHandshake/>
        <h2>The Continuity Pledge</h2>
        <p>Our institution believes a temporary barrier should not quietly become the end of a student’s education.</p>
        <div className="partner-mini-steps">
          <span><b>1</b> Submit application</span>
          <span><b>2</b> EFF verifies institution</span>
          <span><b>3</b> Partner profile launches</span>
          <span><b>4</b> Students receive the referral pathway</span>
        </div>
        <div className="notice"><ShieldCheck/><span>Only approved institutions appear in the public directory. Institute designation is earned later through verified continuity practices and outcomes.</span></div>
      </aside>
      <form action={submitPartnerApplication} className="application-form partner-application-form">
        {error&&<div className="notice error-text" role="alert">{error}</div>}
        <section className="partner-form-section"><h3>Institution</h3>
          <SchoolSelector/>
          <div className="form-grid">
            <label className="full-field">Official legal name <span className="optional">needed only if different</span><input name="legalName" maxLength={180}/></label>
            <label>City <span className="optional">for manually entered schools</span><input name="city" maxLength={100}/></label>
            <label>Official website<input name="websiteUrl" type="url" placeholder="https://www.college.edu" required/></label>
            <label className="full-field">Official logo URL <span className="optional">may be added later</span><input name="logoUrl" type="url" placeholder="https://www.college.edu/logo.png"/></label>
            <label className="full-field">Public partnership summary<textarea name="publicSummary" maxLength={900} required minLength={80} placeholder="Describe why your institution is committed to intervening before preventable student withdrawal."/></label>
          </div>
        </section>

        <fieldset><legend>Authorized representative and campus liaison</legend>
          <div className="form-grid">
            <label>Representative name<input name="primaryContactName" defaultValue={profile?.legal_name??""} required/></label>
            <label>Title<input name="primaryContactTitle" required placeholder="Vice President for Student Affairs"/></label>
            <label>Institution email<input name="primaryContactEmail" type="email" defaultValue={profile?.primary_email??user.email??""} required/></label>
            <label>Direct phone <span className="optional">private</span><input name="primaryContactPhone" type="tel"/></label>
            <label className="full-field">Campus liaison department<input name="liaisonDepartment" required placeholder="Student Success, Retention, Enrollment Management, Financial Aid…"/></label>
          </div>
        </fieldset>

        <fieldset><legend>Partnership commitments</legend>
          <p className="muted">Confirm each commitment. These create an intervention pathway; they do not require a college to approve funding, reverse a decision, or share records without student consent.</p>
          <div className="partner-pledge-checks">
            <label className="check"><input type="checkbox" name="acceptsEffReferrals" required/><span><strong>Student referral:</strong> We will make the EFF Help Desk available when a solvable barrier threatens enrollment.</span></label>
            <label className="check"><input type="checkbox" name="preStopoutReview" required/><span><strong>Pre-stopout review:</strong> When reasonably possible, we will give an affected student a chance to understand and address the barrier before withdrawal.</span></label>
            <label className="check"><input type="checkbox" name="writtenResolutionPath" required/><span><strong>Written path:</strong> We will work toward clear written information about balances, holds, deadlines, responsible offices, and next steps.</span></label>
            <label className="check"><input type="checkbox" name="coordinatesWithEff" required/><span><strong>Consent-based coordination:</strong> We will consider communication from EFF when the student has authorized it.</span></label>
            <label className="check"><input type="checkbox" name="sharesOutcomes" required/><span><strong>Continuous improvement:</strong> We will support privacy-protected outcome learning so recurring barriers can be addressed.</span></label>
          </div>
        </fieldset>

        <label>What should EFF know about your institution’s readiness? <span className="optional">optional</span><textarea name="applicationNote" maxLength={1800} placeholder="Existing emergency aid, retention procedures, leadership support, or a proposed pilot campus…"/></label>
        <div className="partner-submit-note"><CheckCircle2/><span>Submitting is free. EFF will verify the representative and institution before publishing the school’s name or logo.</span></div>
        <button className="button">Submit partnership application</button>
      </form>
    </div></section>
  </main>;
}
