import Link from "next/link";
import {Clock3, GraduationCap, Headphones, HeartHandshake, LockKeyhole, ShieldCheck} from "lucide-react";

export const metadata = {
  title: "EFF National Help Desk",
  description: "Secure, relationship-centered student resource navigation with trained Esther Funds Foundation volunteers.",
};

export default function HelpDeskLanding() {
  return <main className="help-desk-page">
    <section className="help-desk-hero"><div className="shell help-desk-hero-grid"><div>
      <div className="eyebrow">Esther Funds Foundation National Help Desk</div>
      <h1>You do not have to navigate college barriers alone.</h1>
      <p>Open one secure case and work with a trained EFF volunteer when one is available. We listen, help organize the next step, and connect you to the resource or office that owns the decision.</p>
      <div className="hero-actions"><Link className="button light" href="/resources/student-help#open-case">Get Help Now</Link><Link className="button lavender" href="/resources">Browse resources now</Link></div>
    </div><aside className="help-desk-promise"><Headphones/><h2>A relationship—not a random inbox.</h2><p>Your conversation stays connected to one EFF case, even when a different trained volunteer continues the next shift.</p><small>EFF volunteers are not therapists, attorneys, financial-aid administrators, or funding decisionmakers.</small></aside></div></section>
    <section className="section white"><div className="shell"><div className="section-head"><div><div className="eyebrow">How it works</div><h2>Secure help that can continue after one person signs off.</h2></div></div><div className="cards help-desk-feature-grid">
      <article className="card"><LockKeyhole/><h3>One private case</h3><p>Verify your email, then use the secure case link for messages. Ordinary email notifications never include your private story.</p></article>
      <article className="card"><HeartHandshake/><h3>A trained volunteer</h3><p>A volunteer can claim your request when available, read the history, listen, and help with the next practical step.</p></article>
      <article className="card"><Clock3/><h3>Honest availability</h3><p>Live replies depend on trained volunteer coverage. You may still leave a secure message at any time and return through your case link.</p></article>
      <article className="card"><ShieldCheck/><h3>Executive oversight</h3><p>EFF leadership can review transcripts, reassign or close cases, and handle safety, conduct, funding, policy, or privacy escalations.</p></article>
    </div></div></section>
    <section className="section help-desk-volunteer-callout"><div className="shell resource-support"><div><div className="eyebrow">Volunteer with EFF</div><h2>Learn the resources. Serve students well.</h2><p>Complete the EFF National Help Desk training, pass every safety and resource question, and earn a professional course-completion certificate before the volunteer console unlocks.</p><Link className="button" href="/help-desk/volunteer">Start volunteer onboarding</Link></div><GraduationCap className="help-desk-callout-icon"/></div></section>
    <section className="section white"><div className="shell"><div className="notice"><strong>Safety boundary:</strong> If you may be in immediate danger, call 911. For suicide, self-harm, emotional distress, or mental-health crisis support, call or text 988. For local food, shelter, or essentials, dial 211. Do not wait for a Help Desk reply in an emergency.</div></div></section>
  </main>;
}
