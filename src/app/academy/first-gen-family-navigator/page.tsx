import Link from "next/link";
import {createClient} from "@/lib/supabase/server";
import {CoursePlayer} from "../financial-aid-peer-mentor/course-player";
import {
  FIRST_GEN_FAMILY_NAVIGATOR_COURSE_ID,
  firstGenFamilyNavigatorModules,
} from "@/lib/academy/first-gen-family-navigator";

export const metadata = {
  title: "EFF First-Generation Family Navigator Course",
  description: "Practical, asset-based training that helps parents and families support first-generation college students and responsibly guide other families.",
};

export default async function FirstGenFamilyNavigatorCourse({
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
          .eq("course_id", FIRST_GEN_FAMILY_NAVIGATOR_COURSE_ID)
          .maybeSingle()
      : {data: null};
    completion = result.data;
  }

  return (
    <main className="academy-course-page">
      <section className="academy-course-hero academy-family-hero">
        <div className="shell">
          <Link className="academy-back-link" href="/academy">← Leadership Training Academy</Link>
          <div className="eyebrow">Family certification · built for first-generation success</div>
          <h1>EFF First-Generation <span>Family Navigator</span></h1>
          <p>Learn the college map, protect student agency, respond to crises, advocate clearly, and help another family find the next right step.</p>
          <div className="academy-course-facts">
            <span>8 practical levels</span>
            <span>1,000 XP available</span>
            <span>Family scenarios + scripts</span>
            <span>EFF certificate at 80%</span>
          </div>
        </div>
      </section>
      <CoursePlayer
        modules={firstGenFamilyNavigatorModules}
        signedIn={Boolean(userId)}
        alreadyCompleted={Boolean(completion)}
        completedScore={completion?.score ?? null}
        failedScore={query.result === "retry" ? Number(query.score ?? 0) : null}
        courseKind="first-gen-family"
      />
    </main>
  );
}
