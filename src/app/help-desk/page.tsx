import type {Metadata} from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Clock3,
  HeartHandshake,
  LifeBuoy,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Users,
} from "lucide-react";
import {createAdminClient} from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "National Student Help Desk",
};

export default async function HelpDeskHome() {
  let openCases = 0;
  let activeVolunteers = 0;
  try {
    const admin = createAdminClient();
    const [{count: cases}, {count: volunteers}] = await Promise.all([
      admin
        .from("student_help_cases")
        .select("id", {count: "exact", head: true})
        .not("verified_at", "is", null)
        .not("status", "in", "(resolved,closed)"),
      admin
        .from("help_desk_volunteer_profiles")
        .select("user_id", {count: "exact", head: true})
        .eq("status", "active"),
    ]);
    openCases = cases ?? 0;
    activeVolunteers = volunteers ?? 0;
  } catch {}

  return (
    <main className="help-desk-home">
      <section className="help-desk-hero">
        <div className="shell help-desk-hero-grid">
          <div>
            <div className="help-desk-badge"><ShieldCheck/> Secure student support nationwide</div>
            <h1>You do not have to navigate the next step alone.</h1>
            <p>
              Open one private case for a college barrier, receive the right resource path,
              send secure updates, and keep your follow-up in one place.
            </p>
            <div className="hero-actions">
              <Link className="button" href="/help-desk/open-case">
                Open a Secure Case <ArrowRight size={17}/>
              </Link>
              <Link className="button light" href="/help-desk/access">
                Access an Existing Case
              </Link>
            </div>
            <small>
              Free to use. EFF cannot guarantee a school decision, funding, or outcome.
            </small>
          </div>
          <aside className="help-desk-hero-panel">
            <HeartHandshake/>
            <strong>Real listening. Clear next steps. Accountable follow-up.</strong>
            <ul>
              <li>Financial aid, balances, holds, enrollment, housing, food, records, access, and student-rights navigation</li>
              <li>Secure case numbers and time-limited access links</li>
              <li>Separate from scholarship applications and MyEFF membership</li>
            </ul>
          </aside>
        </div>
      </section>
      <section className="help-desk-live-line">
        <div className="shell">
          <div><strong>{openCases}</strong><span>verified open cases</span></div>
          <div><strong>{activeVolunteers}</strong><span>active trained volunteers</span></div>
          <p><Clock3/> Case updates are sent at meaningful follow-up points.</p>
        </div>
      </section>
      <section className="section white">
        <div className="shell">
          <div className="section-head">
            <div><div className="eyebrow">Choose your next step</div><h2>One Help Desk. Three clear ways in.</h2></div>
            <p>The National Student Help Desk has its own cases, volunteer area, staff access, emails, and records.</p>
          </div>
          <div className="help-desk-entry-grid">
            <article><MessageCircle/><h3>I need student support</h3><p>Open a new private case or continue a verified case without starting a scholarship application.</p><Link className="card-link" href="/help-desk/open-case">Open a secure case →</Link></article>
            <article><LockKeyhole/><h3>I already have a case</h3><p>Enter your Help Desk case number and verified email to receive a time-limited secure link.</p><Link className="card-link" href="/help-desk/access">Access my case →</Link></article>
            <article><Users/><h3>I want to volunteer</h3><p>Learn the boundaries, complete onboarding and earn 100% on the assessment before serving.</p><Link className="card-link" href="/help-desk/volunteer">Explore volunteering →</Link></article>
          </div>
        </div>
      </section>
      <section className="section help-desk-service">
        <div className="shell help-desk-service-grid">
          <div><BookOpenCheck/><div><strong>Resource navigation</strong><p>Find the office, documents, questions, and public resources that fit the barrier.</p></div></div>
          <div><LifeBuoy/><div><strong>Advocacy preparation</strong><p>Organize the facts and next request without promising an outcome a school or EFF has not confirmed.</p></div></div>
          <div><ShieldCheck/><div><strong>Privacy by design</strong><p>Do not send passwords, Social Security numbers, tax returns, banking details, or verification codes.</p></div></div>
        </div>
      </section>
      <section className="section white">
        <div className="shell help-desk-emergency">
          <LifeBuoy/>
          <div>
            <div className="eyebrow">Emergency guidance</div>
            <h2>The National Help Desk is not an emergency service.</h2>
            <p>If you are in immediate physical danger, call 911. For suicide, self-harm, or emotional-crisis support, call or text 988. For local food, housing, and essential-needs navigation, call 211.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
