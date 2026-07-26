import Link from "next/link";
import {CheckCircle2, HeartHandshake, LockKeyhole, Megaphone, ShieldCheck, Sparkles} from "lucide-react";
import {submitReachAmbassadorApplication} from "./actions";

export const metadata = {
  title: "Apply to Become a REACH Campus Ambassador",
  description: "Join Esther Funds Foundation as a trained REACH Campus Ambassador and connect students to care, resources, and encouragement.",
};

export default async function ReachAmbassadorApplyPage({
  searchParams,
}: {
  searchParams: Promise<{error?: string}>;
}) {
  const query = await searchParams;
  return <main className="reach-apply-page">
    <section className="reach-directory-hero"><div className="shell">
      <div className="eyebrow">Esther Funds Foundation · R.E.A.C.H.</div>
      <h1>Bring practical care to your campus.</h1>
      <p>REACH Campus Ambassadors help students feel seen, find credible resources, access approved workshops, and stay connected when college gets hard.</p>
      <div className="resource-actions">
        <a className="button" href="#application">Apply now</a>
        <Link className="button outline" href="/reach/ambassadors">Meet the ambassadors</Link>
      </div>
    </div></section>

    <section className="section white"><div className="shell">
      <div className="reach-join-grid">
        <div>
          <div className="eyebrow">What happens next</div>
          <h2>Apply once. Start immediately.</h2>
          <div className="steps" style={{marginTop:24}}>
            <div className="step"><span className="step-num">1</span><div><strong>Submit this application</strong><p>Tell us who you are, what your campus needs, and why REACH matters to you.</p></div></div>
            <div className="step"><span className="step-num">2</span><div><strong>Receive your welcome package</strong><p>Your acceptance email includes an official PDF letter, the account-claim link, GroupMe, training, and social template.</p></div></div>
            <div className="step"><span className="step-num">3</span><div><strong>Complete certification</strong><p>Finish the EFF-hosted course and earn at least 80% on the final assessment.</p></div></div>
            <div className="step"><span className="step-num">4</span><div><strong>Serve with support</strong><p>Use approved workshop links, care protocols, outreach tools, and reporting forms in your secure workspace.</p></div></div>
          </div>
        </div>
        <div className="reach-commitment-card">
          <Sparkles/>
          <h3>Ambassador commitment</h3>
          <ul>
            <li><HeartHandshake/> Lead with empathy, faith, dignity, and inclusion.</li>
            <li><ShieldCheck/> Protect student privacy and stay inside the peer-support role.</li>
            <li><Megaphone/> Use approved EFF and REACH messages and materials.</li>
            <li><LockKeyhole/> Never create an unofficial EFF or REACH account, page, fundraiser, or group.</li>
          </ul>
        </div>
      </div>
    </div></section>

    <section className="section" id="application"><div className="shell" style={{maxWidth:960}}>
      <div className="eyebrow">Campus Ambassador Application</div>
      <h2>Tell us about you.</h2>
      <p className="muted">Submitting this form enrolls you in REACH Ambassador onboarding and training. It does not create employment or guarantee the availability of boxes, funding, merchandise, or campus approval.</p>
      {query.error && <div className="notice error-text" role="alert">{query.error}</div>}
      <form action={submitReachAmbassadorApplication} className="application-form career-form reach-apply-form">
        <input className="reach-honeypot" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"/>
        <section className="form-section"><span className="section-number">01</span><h3>Your information</h3>
          <div className="form-grid">
            <label>Full legal name<input name="fullName" required minLength={2} maxLength={100}/></label>
            <label>Preferred name <span className="muted">(optional)</span><input name="preferredName" maxLength={60}/></label>
            <label>Email address<input name="email" type="email" required maxLength={180}/></label>
            <label>Phone number <span className="muted">(optional)</span><input name="phone" type="tel" maxLength={40}/></label>
            <label className="full-field">College or university<input name="institution" required minLength={2} maxLength={180}/></label>
            <label>Campus city <span className="muted">(optional)</span><input name="city" maxLength={100}/></label>
            <label>State <span className="muted">(optional)</span><input name="state" maxLength={60}/></label>
            <label>Major or area of study <span className="muted">(optional)</span><input name="major" maxLength={140}/></label>
            <label>Classification <span className="muted">(optional)</span><select name="classYear" defaultValue=""><option value="">Choose one</option><option>First-year</option><option>Sophomore</option><option>Junior</option><option>Senior</option><option>Graduate student</option><option>Alumna / Alumnus</option></select></label>
            <label>Expected graduation <span className="muted">(optional)</span><input name="expectedGraduation" maxLength={30} placeholder="Example: Spring 2028"/></label>
            <label>Instagram username <span className="muted">(optional)</span><input name="instagramHandle" maxLength={100} placeholder="@username"/></label>
          </div>
        </section>

        <section className="form-section"><span className="section-number">02</span><h3>Your purpose</h3>
          <div className="form-grid">
            <label className="full-field">Why do you want to become a REACH Campus Ambassador?<textarea name="whyReach" required minLength={40} maxLength={1600} rows={6}/></label>
            <label className="full-field">What student need or barrier do you most want to address on your campus?<textarea name="campusNeed" required minLength={30} maxLength={1600} rows={6}/></label>
            <label className="full-field">Service, leadership, or outreach experience <span className="muted">(optional)</span><textarea name="serviceExperience" maxLength={1600} rows={5}/></label>
          </div>
        </section>

        <section className="form-section"><span className="section-number">03</span><h3>Commitments</h3>
          <div className="reach-application-checks">
            <label className="check"><input name="availabilityConfirmed" type="checkbox" required/><span>I will complete training before representing REACH in an activity or receiving program materials.</span></label>
            <label className="check"><input name="conductConfirmed" type="checkbox" required/><span>I will communicate professionally, follow campus rules, use approved materials, and promptly report safety or conduct concerns.</span></label>
            <label className="check"><input name="privacyConfirmed" type="checkbox" required/><span>I will protect student privacy, never collect passwords or sensitive financial records, and obtain consent before sharing photos or stories.</span></label>
            <label className="check"><input name="communicationsConsent" type="checkbox" required/><span>I agree to receive essential REACH onboarding, training, activity, safety, and program communications.</span></label>
          </div>
          <div className="career-privacy"><ShieldCheck/><p>Do not place Social Security numbers, passwords, verification codes, tax returns, student records, or full financial-account details in this application.</p></div>
        </section>
        <button className="button" type="submit"><CheckCircle2 size={18}/> Submit and begin onboarding</button>
      </form>
    </div></section>
  </main>;
}
