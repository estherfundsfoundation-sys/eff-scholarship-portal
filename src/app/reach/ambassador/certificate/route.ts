import {readFile} from "node:fs/promises";
import path from "node:path";
import {requireReachAmbassador} from "@/lib/reach/ambassador";
import {buildFinancialAidPeerMentorCertificate} from "@/lib/academy/financial-aid-certificate";

export const dynamic = "force-dynamic";

export async function GET() {
  const {ambassador} = await requireReachAmbassador("/reach/ambassador/certificate");
  if (!ambassador) return new Response("Ambassador access required.", {status: 403});
  if (!ambassador.certified_at || !ambassador.certificate_code || ambassador.training_score === null) {
    return new Response("Complete the REACH Ambassador certification first.", {status: 403});
  }
  let logoBytes: Uint8Array | undefined;
  try {
    logoBytes = new Uint8Array(await readFile(path.join(process.cwd(), "public", "brand", "eff-logo.png")));
  } catch {}
  const learnerName = ambassador.full_name || "REACH Campus Ambassador";
  const bytes = await buildFinancialAidPeerMentorCertificate({
    learnerName,
    score: ambassador.training_score,
    completedAt: ambassador.certified_at,
    certificateCode: ambassador.certificate_code,
    logoBytes,
    courseName: "EFF REACH CAMPUS AMBASSADOR",
    courseScope: "Student-safe training in campus outreach, resource navigation, care, professionalism, privacy, and responsible referral.",
    disclaimer: "EFF course-completion credential. Not a counseling, legal, financial-aid, emergency-response, or professional license.",
  });
  const safeName = learnerName.replace(/[^A-Za-z0-9]+/g, "-");
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="EFF-REACH-Certificate-${safeName}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
