import Link from "next/link";
import {ShieldCheck} from "lucide-react";
import {requireReachAmbassador} from "@/lib/reach/ambassador";
import {reachAmbassadorModules} from "@/lib/reach/training";
import {ReachCoursePlayer} from "./reach-course-player";

export const metadata = {
  title: "REACH Campus Ambassador Certification",
  description: "The official Esther Funds Foundation REACH Campus Ambassador training and certification course.",
};

export default async function ReachAmbassadorTrainingPage({
  searchParams,
}: {
  searchParams: Promise<{score?: string; result?: string}>;
}) {
  const query = await searchParams;
  const {ambassador} = await requireReachAmbassador("/reach/ambassador/training");
  if (!ambassador) return <main className="section white"><div className="shell" style={{maxWidth:760}}>
    <div className="card"><div className="eyebrow">REACH Ambassador training</div><h2>Claim your ambassador account first.</h2><p>Use your private claim link to connect the invitation to any verified email address you control.</p><Link className="button" href="/reach/claim">Claim my account</Link></div>
  </div></main>;

  return <main className="academy-course-page">
    <section className="academy-course-hero"><div className="shell">
      <Link className="academy-back-link" href="/reach/ambassador">← Ambassador workspace</Link>
      <div className="eyebrow">Official EFF certification · hosted inside your secure workspace</div>
      <h1>REACH Campus <span>Ambassador</span></h1>
      <p>Learn to care, connect, run useful campus outreach, protect students, represent the brand, and respond when the situation is bigger than your role.</p>
      <div className="academy-course-facts">
        <span>8 interactive levels</span>
        <span>Real student scenarios</span>
        <span>Workshop + outreach tools</span>
        <span>Professional PDF certificate at 80%</span>
      </div>
    </div></section>
    <div className="academy-scope-strip"><div className="shell"><ShieldCheck/><span><strong>Student-safe scope:</strong> Ambassadors are trained peer connectors. This course does not authorize counseling, legal advice, financial-aid decisions, emergency response, fundraising, media statements, or access to another person’s accounts or records.</span></div></div>
    <ReachCoursePlayer
      modules={reachAmbassadorModules}
      alreadyCompleted={Boolean(ambassador.certified_at)}
      completedScore={ambassador.training_score ?? null}
      failedScore={query.result === "retry" ? Number(query.score ?? 0) : null}
    />
  </main>;
}
