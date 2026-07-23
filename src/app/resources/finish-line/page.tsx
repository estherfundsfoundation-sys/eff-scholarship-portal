import type {Metadata} from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpenCheck,
  FileCheck2,
  GraduationCap,
  HeartHandshake,
  MailCheck,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";
import {FinishLineTools} from "./FinishLineTools";

export const metadata:Metadata={
  title:"Finish Line Student Support",
  description:"Free advocacy scripts, scholarship rescue tools, recommendation help, and stay-enrolled guidance from Esther Funds Foundation.",
};

const services=[
  {icon:HeartHandshake,title:"Stay-Enrolled Advocacy",text:"Turn a tuition balance, aid delay, basic-needs emergency, or registration hold into a clear email, phone script, and action plan."},
  {icon:MailCheck,title:"3 A.M. Scholarship Rescue",text:"Get a last-minute checklist, recommendation-request email, essay tools, and an application tracker without paying a fee."},
  {icon:SearchCheck,title:"Scholarship Match Strategy",text:"Build a realistic three-tier search list using eligibility, effort, award value, and deadline instead of applying randomly."},
  {icon:FileCheck2,title:"Opportunity-Ready Packet",text:"Prepare the core materials students repeatedly need: resume, short bio, activity list, recommendation request, and professional email."},
];

export default function FinishLinePage(){return <main>
  <section className="finish-line-hero"><div className="shell finish-line-hero-grid"><div><Link className="back-link" href="/resources"><ArrowLeft size={17}/>Student Help Center</Link><div className="eyebrow">Free help from Esther Funds Foundation</div><h1>Your education is worth <span>fighting for.</span></h1><p>Use practical tools to ask the right office, explain the problem clearly, and take the next documented step. No fee, no shame, and no promise of a result we cannot control.</p><div className="hero-actions"><a className="button light" href="#build">Build my support packet</a><a className="button lavender" href="#scholarship-rescue">Scholarship rescue</a></div></div><aside className="finish-line-promise"><ShieldCheck size={34}/><strong>Your answers stay with you.</strong><p>The packet builder runs in your browser. It does not submit or save the information you type.</p><small>Never enter a Social Security number, password, verification code, tax return, full bank information, or unredacted student ID.</small></aside></div></section>

  <section className="section white"><div className="shell"><div className="section-head"><div><div className="eyebrow">One center, six practical services</div><h2>Support that does not depend on an award</h2></div><p>These tools help students communicate, organize, and advocate. A school, scholarship provider, or outside agency still makes every eligibility and funding decision.</p></div><div className="finish-service-grid">{services.map(({icon:Icon,title,text})=><article key={title}><Icon/><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>

  <FinishLineTools/>

  <section className="section white" id="why"><div className="shell resource-section"><div><div className="resource-icon"><BookOpenCheck/></div><div className="eyebrow">Built from documented student barriers</div><h2>Why EFF created these tools</h2><p className="lead">The center combines official financial-aid processes with research on basic-needs insecurity and emergency support. It is designed to make the next step easier, not to replace a school professional or guarantee funding.</p></div><div className="evidence-grid">
    <article><strong>23%</strong><h3>of college students experienced food insecurity</h3><p>A 2024 U.S. Government Accountability Office report estimated that 3.8 million students experienced food insecurity in 2020.</p><a href="https://www.gao.gov/products/gao-24-107074" target="_blank" rel="noopener noreferrer">Read the GAO report</a></article>
    <article><strong>59%</strong><h3>of potentially eligible students did not report SNAP</h3><p>The same GAO analysis found that many food-insecure students who were potentially eligible did not report receiving SNAP benefits.</p><a href="https://www.gao.gov/products/gao-24-107074" target="_blank" rel="noopener noreferrer">Review the federal findings</a></article>
    <article><GraduationCap/><h3>Changed finances can be reviewed</h3><p>Federal Student Aid directs students with special financial circumstances to ask their school about an aid adjustment, often called professional judgment.</p><a href="https://studentaid.gov/articles/financial-aid-not-enough/" target="_blank" rel="noopener noreferrer">See official Federal Student Aid guidance</a></article>
  </div><div className="evidence-note"><strong>Evidence standard:</strong> EFF links students to original government or program sources, labels eligibility limits, and avoids claims that a tool or request will produce money. Research on college-aid programs, including emergency assistance, continues to examine effects on persistence and completion. <a href="https://ies.ed.gov/use-work/awards/effects-college-aid-programs-systematic-review-and-meta-analysis" target="_blank" rel="noopener noreferrer">Review the Institute of Education Sciences project.</a></div></div></section>

  <section className="section finish-line-close"><div className="shell resource-support"><div><div className="eyebrow">Need a person to review the next step?</div><h2>EFF can help you organize the request.</h2><p>Send your school, exact deadline, the page or office involved, what you already tried, and a redacted screenshot when relevant. Do not email private account credentials or full financial records.</p><div className="hero-actions"><a className="button" href="mailto:nationals@estherfundsinc.org?subject=Finish%20Line%20Student%20Support&body=My%20name%3A%0AMy%20school%3A%0AMy%20deadline%3A%0AWhat%20is%20putting%20my%20education%20at%20risk%3A%0AWhat%20I%20have%20already%20tried%3A%0A">Email the national office</a><Link className="button outline" href="/resources">See all student resources</Link></div></div><aside className="finish-line-contact"><strong>Questions</strong><a href="mailto:nationals@estherfundsinc.org">nationals@estherfundsinc.org</a><small>EFF provides general educational support, not legal, tax, or financial advice.</small></aside></div></section>
</main>}
