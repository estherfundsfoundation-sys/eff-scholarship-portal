import Link from "next/link";
import {createClient} from "@/lib/supabase/server";
import {CoursePlayer} from "./course-player";
import {
  FINANCIAL_AID_PEER_MENTOR_COURSE_ID,
  financialAidPeerMentorModules,
} from "@/lib/academy/financial-aid-peer-mentor";

export const metadata = {
  title: "EFF Financial Aid Peer Mentor Course",
  description: "Practical FAFSA navigation training for student peer mentors, created by Esther Funds Foundation using official Federal Student Aid resources.",
};

export default async function FinancialAidPeerMentorCourse({
  searchParams,
}: {
  searchParams: Promise<{score?: string; result?: string}>;
}) {
  const query = await searchParams;
  let userId: string | null = null;
  let completion: {score: number; completed_at: string; certificate_code: string} | null = null;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = await createClient();
    const {data: {user}} = await supabase.auth.getUser();
    userId = user?.id ?? null;
    const result = user
      ? await supabase
          .from("academy_course_completions")
          .select("score,completed_at,certificate_code")
          .eq("user_id", user.id)
          .eq("course_id", FINANCIAL_AID_PEER_MENTOR_COURSE_ID)
          .maybeSingle()
      : {data: null};
    completion = result.data;
  }

  return (
    <main className="academy-course-page">
      <section className="academy-course-hero">
        <div className="shell">
          <Link className="academy-back-link" href="/academy">← Leadership Training Academy</Link>
          <div className="eyebrow">Featured certification course</div>
          <h1>EFF Financial Aid <span>Peer Mentor</span></h1>
          <p>Explain the process. Protect the student. Know when to refer.</p>
          <div className="academy-course-facts">
            <span>8 modules</span>
            <span>About 3 hours, self-paced</span>
            <span>80% final score required</span>
            <span>EFF completion certificate</span>
          </div>
        </div>
      </section>
      <CoursePlayer
        modules={financialAidPeerMentorModules}
        signedIn={Boolean(userId)}
        alreadyCompleted={Boolean(completion)}
        completedScore={completion?.score ?? null}
        failedScore={query.result === "retry" ? Number(query.score ?? 0) : null}
      />
    </main>
  );
}
