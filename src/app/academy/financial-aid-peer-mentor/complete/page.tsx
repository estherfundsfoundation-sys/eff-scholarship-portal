import Link from "next/link";
import {redirect} from "next/navigation";
import {Award, Download, ShieldCheck} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
import {FINANCIAL_AID_PEER_MENTOR_COURSE_ID} from "@/lib/academy/financial-aid-peer-mentor";

export const metadata = {title: "Your EFF Financial Aid Peer Mentor Certificate"};

export default async function CourseCompletePage() {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/academy/financial-aid-peer-mentor/complete");
  const [{data: completion}, {data: profile}] = await Promise.all([
    supabase.from("academy_course_completions").select("score,completed_at,certificate_code").eq("user_id", user.id).eq("course_id", FINANCIAL_AID_PEER_MENTOR_COURSE_ID).maybeSingle(),
    supabase.from("profiles").select("legal_name,preferred_name").eq("id", user.id).single(),
  ]);
  if (!completion) redirect("/academy/financial-aid-peer-mentor");
  const name = profile?.legal_name || profile?.preferred_name || user.email || "EFF learner";

  return (
    <main className="section academy-certificate-page">
      <div className="shell" style={{maxWidth: 900}}>
        <div className="academy-certificate-preview">
          <div className="academy-certificate-seal"><Award aria-hidden="true"/></div>
          <div className="eyebrow">Esther Funds Foundation Leadership Training Academy</div>
          <p className="academy-script">Certificate of Course Completion</p>
          <h1>{name}</h1>
          <p>has completed the requirements for</p>
          <h2>EFF Financial Aid Peer Mentor</h2>
          <p>with a passing score of <strong>{completion.score}%</strong> on {new Date(completion.completed_at).toLocaleDateString("en-US", {month: "long", day: "numeric", year: "numeric"})}.</p>
          <small>Certificate {completion.certificate_code}</small>
        </div>
        <div className="academy-certificate-actions">
          <a className="button" href="/academy/certificate"><Download size={18}/> Download PDF certificate</a>
          <Link className="button outline" href="/academy">Return to academy</Link>
        </div>
        <div className="academy-credential-note">
          <ShieldCheck aria-hidden="true"/>
          <p><strong>Credential scope:</strong> This certificate recognizes completion of an Esther Funds Foundation peer-navigation course. It is not issued or endorsed by the U.S. Department of Education and does not authorize the holder to access accounts, determine aid eligibility, perform verification, exercise professional judgment, or represent themselves as a financial-aid administrator.</p>
        </div>
      </div>
    </main>
  );
}
