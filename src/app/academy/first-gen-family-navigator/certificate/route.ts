import {readFile} from "node:fs/promises";
import path from "node:path";
import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {FIRST_GEN_FAMILY_NAVIGATOR_COURSE_ID} from "@/lib/academy/first-gen-family-navigator";
import {buildFinancialAidPeerMentorCertificate} from "@/lib/academy/financial-aid-certificate";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/sign-in?next=/academy/first-gen-family-navigator/complete", request.url));

  const {data: completion} = await supabase
    .from("academy_course_completions")
    .select("score,completed_at,certificate_code,certificate_name")
    .eq("user_id", user.id)
    .eq("course_id", FIRST_GEN_FAMILY_NAVIGATOR_COURSE_ID)
    .maybeSingle();
  if (!completion) return new NextResponse("Complete the course before downloading a certificate.", {status: 403});
  if (!completion.certificate_name?.trim()) return NextResponse.redirect(new URL("/academy/first-gen-family-navigator/complete?error=name", request.url));

  let logoBytes: Uint8Array | undefined;
  try {
    logoBytes = await readFile(path.join(process.cwd(), "public", "brand", "eff-logo.png"));
  } catch {
    // The certificate remains valid and branded if the optional logo asset is unavailable.
  }

  const bytes = await buildFinancialAidPeerMentorCertificate({
    learnerName: completion.certificate_name,
    score: completion.score,
    completedAt: completion.completed_at,
    certificateCode: completion.certificate_code,
    logoBytes,
    courseName: "EFF FIRST-GENERATION FAMILY NAVIGATOR",
    courseScope: "Asset-based family support, student advocacy, privacy, crisis navigation, and responsible referral.",
    disclaimer: "EFF course-completion credential. Not professional licensure or authority to act for a student or institution.",
  });
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="EFF-First-Generation-Family-Navigator-${completion.certificate_code}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
