import type {Metadata} from "next";
import Link from "next/link";
import {Building2,CheckCircle2,LockKeyhole,ShieldCheck} from "lucide-react";
import {signUp} from "@/app/auth/actions";
import {createClient} from "@/lib/supabase/server";

export const metadata:Metadata={title:"Join the College Continuity Partnership"};

export default async function PartnerJoin({searchParams}:{searchParams:Promise<{error?:string}>}){
  const {error}=await searchParams;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  return <main className="partner-join-page">
    <section className="resource-hero">
      <div className="shell partner-join-head">
        <div><Link className="back-link" href="/partners">← Partnership overview</Link><div className="eyebrow">100% free institution account</div><h1>Become an <span>EFF Partner Campus.</span></h1><p>One authorized representative can begin the application. Your school will not appear publicly until EFF verifies and approves the partnership.</p></div>
        <aside className="resource-promise"><Building2/><strong>No membership fee.</strong><small>No setup fee. No student referral fee. Partnership participation does not guarantee funding or case outcomes.</small></aside>
      </div>
    </section>
    <section className="section white"><div className="shell partner-join-grid">
      <div>
        <div className="eyebrow">Before you begin</div><h2>Use your official institution email.</h2>
        <div className="partner-requirements">
          {[
            "You are authorized to represent the college or begin an institutional partnership conversation.",
            "Your institution is a U.S. postsecondary school or recognized higher-education organization.",
            "You can identify a student-success, retention, enrollment, financial-aid, or student-affairs liaison.",
            "You understand that EFF verifies every institution before publishing its logo or profile."
          ].map(item=><div key={item}><CheckCircle2/><span>{item}</span></div>)}
        </div>
        <div className="notice"><ShieldCheck/><span>Institution information may be verified against NCES/IPEDS and the school’s official website. Public profiles never display private staff phone numbers unless the institution chooses to publish them.</span></div>
      </div>
      <div className="partner-signup-card">
        {user?<>
          <LockKeyhole/><h3>Your secure account is ready.</h3><p>Continue to the institution application and Continuity Pledge.</p>
          <Link className="button" href="/partners/onboarding">Continue application</Link>
          <p className="muted">Signed in as {user.email}</p>
        </>:<>
          <div className="eyebrow">Step 1 of 2</div><h3>Create the representative account</h3><p>The partnership profile is completed after email verification.</p>
          {error&&<p className="notice error-text" role="alert">{error}</p>}
          <form action={signUp} className="partner-signup-form">
            <input type="hidden" name="next" value="/partners/onboarding"/>
            <label>Your full name<input name="legalName" autoComplete="name" required minLength={2}/></label>
            <label>Preferred name <span className="optional">optional</span><input name="preferredName" autoComplete="nickname"/></label>
            <label>Official institution email<input name="email" type="email" autoComplete="email" required/></label>
            <label>Create a password<input name="password" type="password" autoComplete="new-password" required minLength={10}/><small>At least 10 characters.</small></label>
            <button className="button">Create free institution account</button>
          </form>
          <p className="muted">Already started? <Link className="card-link" href="/sign-in?next=%2Fpartners%2Fdashboard">Sign in to the partner portal</Link></p>
        </>}
      </div>
    </div></section>
  </main>;
}
