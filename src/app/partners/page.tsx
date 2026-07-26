import type {Metadata} from "next";
import Link from "next/link";
import {
  ArrowRight,BarChart3,Building2,CheckCircle2,ClipboardCheck,
  FileText,GraduationCap,HandHeart,HeartHandshake,Network,ShieldCheck,Users
} from "lucide-react";
import {createAdminClient} from "@/lib/supabase/admin";

export const metadata:Metadata={
  title:"College Continuity Partners",
  description:"Join the free Every Future Fulfilled College Continuity Partnership and intervene before a solvable barrier becomes a student dropout."
};

const commitments=[
  ["Refer before withdrawal","Offer students an EFF referral when a financial, housing, documentation, or basic-needs barrier threatens enrollment.",HeartHandshake],
  ["Provide a written path","Help the student understand the balance, hold, deadline, responsible office, and available resolution options.",FileText],
  ["Coordinate with consent","Work with EFF when a student authorizes case-specific communication and follow-up.",Users],
  ["Learn from outcomes","Use privacy-protected case patterns to improve retention systems before the next student reaches crisis.",BarChart3]
];

export default async function Partners(){
  let partnerCount=0;
  try{
    const admin=createAdminClient();
    const {count}=await admin.from("eff_partner_institutions").select("id",{count:"exact",head:true})
      .in("status",["approved","active"]).eq("public_profile",true);
    partnerCount=count??0;
  }catch{}
  return <main className="partner-page">
    <section className="partner-hero">
      <div className="shell partner-hero-grid">
        <div>
          <div className="eyebrow">Every Future Fulfilled College Continuity Partnership</div>
          <h1>Before a student <span>stops out,</span> we step in.</h1>
          <p>Join a national network of colleges committed to intervening before a solvable financial, administrative, housing, or basic-needs barrier becomes a permanent withdrawal.</p>
          <div className="hero-actions">
            <Link className="button light" href="/partners/join">Become a partner—free</Link>
            <Link className="button lavender" href="/partners/directory">Meet our partner schools</Link>
          </div>
          <div className="partner-free"><ShieldCheck/><strong>100% free for U.S. colleges and universities.</strong><span>No membership fee. No student referral fee.</span></div>
        </div>
        <aside className="partner-pledge">
          <span className="tape-label">THE CONTINUITY PLEDGE</span>
          <GraduationCap/>
          <blockquote>“A temporary barrier should never quietly become the end of a student’s education.”</blockquote>
          <p>Partner campuses create one more intervention point between a student and preventable withdrawal.</p>
        </aside>
      </div>
    </section>

    <section className="partner-count-strip">
      <div className="shell">
        <strong>{partnerCount}</strong>
        <span>active partner school{partnerCount===1?"":"s"}</span>
        <p>Completed registrations are recognized immediately and may be reviewed or removed by EFF.</p>
        <Link href="/partners/directory">View directory <ArrowRight size={16}/></Link>
      </div>
    </section>

    <section className="section white">
      <div className="shell">
        <div className="section-head"><div><div className="eyebrow">The partnership</div><h2>A practical bridge between risk and retention.</h2></div><p>EFF remains independent and student-centered. The college retains its decision-making authority while giving students a clearer, earlier path to help.</p></div>
        <div className="partner-commitment-grid">{commitments.map(([title,text,Icon])=><article className="partner-commitment" key={String(title)}>
          <Icon/><span>Partner commitment</span><h3>{String(title)}</h3><p>{String(text)}</p>
        </article>)}</div>
      </div>
    </section>

    <section className="section partner-provides">
      <div className="shell partner-provides-grid">
        <div><div className="eyebrow">By partnering, your students receive</div><h2>One case. One plan. Follow-through that stays visible.</h2>
          <div className="partner-benefit-list">
            {[
              "A private case number and verification process",
              "A 72-hour continuity plan for urgent, eligible cases",
              "Document organization and department routing",
              "Consent-based communication with the institution",
              "Fall/Spring groceries and school-supplies review when funding permits",
              "Scholarship, emergency-resource, reinstatement, or transfer pathways",
              "Follow-up through the student’s next enrollment checkpoint"
            ].map(item=><div key={item}><CheckCircle2/><span>{item}</span></div>)}
          </div>
        </div>
        <div className="partner-account-card">
          <Building2/>
          <h3>Your institution account</h3>
          <p>Each partner school receives a secure account and public profile in the national directory.</p>
          <ul>
            <li>Display your official logo and commitment</li>
            <li>Maintain a campus liaison and contact path</li>
            <li>Receive partner updates and referral guidance</li>
            <li>Track partnership status and readiness steps</li>
            <li>Share a direct EFF Help Desk link with students</li>
          </ul>
          <Link className="button" href="/partners/join">Create a free account <ArrowRight size={16}/></Link>
        </div>
      </div>
    </section>

    <section className="section white">
      <div className="shell">
        <div className="section-head"><div><div className="eyebrow">How it works</div><h2>From campus commitment to student continuity.</h2></div></div>
        <div className="partner-steps">
          {[
            ["01","Create the institution account","A college representative registers with an official institutional email."],
            ["02","Submit the free partnership profile","Select the institution, identify the liaison, add the logo, and accept the Continuity Pledge."],
            ["03","The partnership activates","The school’s logo, pledge, and public partner profile appear in the national directory immediately."],
            ["04","Launch the student referral pathway","The school receives partner materials, its institution account, and the Help Desk referral link."],
            ["05","Build toward Institute status","Partner campuses can earn the Institute designation through verified response and student-continuity outcomes."]
          ].map(([number,title,text])=><article key={number}><b>{number}</b><div><h3>{title}</h3><p>{text}</p></div></article>)}
        </div>
      </div>
    </section>

    <section className="section partner-designations">
      <div className="shell">
        <div className="section-head"><div><div className="eyebrow">Recognition with meaning</div><h2>Partner first. Institute by demonstrated impact.</h2></div><p>The program is not accreditation and does not replace institutional, legal, or regulatory responsibilities.</p></div>
        <div className="partner-tier-grid">
          <article><HandHeart/><span>Entry designation</span><h3>EFF Partner Campus</h3><p>Verified participation, a named liaison, a public partnership profile, and commitment to intervene before preventable withdrawal.</p></article>
          <article className="institute"><Network/><span>Earned designation</span><h3>EFF Institute for Student Continuity</h3><p>A higher recognition based on verified response practices, transparent resolution pathways, and measurable student-continuity outcomes.</p></article>
        </div>
      </div>
    </section>

    <section className="section white">
      <div className="shell partner-cta">
        <ClipboardCheck/>
        <div><div className="eyebrow">Founding partner invitation</div><h2>Help create the intervention students should have had all along.</h2><p>Open to accredited and state-authorized U.S. postsecondary institutions. Applications are reviewed before a school is publicly listed.</p></div>
        <Link className="button" href="/partners/join">Start the free application <ArrowRight size={16}/></Link>
      </div>
    </section>
  </main>;
}
