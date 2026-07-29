import {readFile} from "node:fs/promises";
import path from "node:path";
import {NextResponse} from "next/server";
import {requireHelpDeskVolunteer} from "@/lib/help-desk/auth";
import {buildFinancialAidPeerMentorCertificate} from "@/lib/academy/financial-aid-certificate";

export async function GET() {
  const {profile} = await requireHelpDeskVolunteer("/help-desk/volunteer/certificate");
  let logoBytes: Uint8Array | undefined;
  try { logoBytes = await readFile(path.join(process.cwd(),"public","brand","eff-logo.png")); } catch {}
  const bytes = await buildFinancialAidPeerMentorCertificate({
    learnerName: profile.display_name,
    score: 100,
    completedAt: profile.trained_at,
    certificateCode: profile.certificate_number,
    logoBytes,
    courseName: "EFF NATIONAL HELP DESK VOLUNTEER",
    courseScope: "Training in student-centered resource navigation, privacy, crisis boundaries, escalation, and secure case service.",
    disclaimer: "EFF course-completion credential. Not a clinical, legal, financial-aid administrator, or emergency-response license.",
  });
  return new NextResponse(Buffer.from(bytes),{headers:{
    "Content-Type":"application/pdf",
    "Content-Disposition":`attachment; filename="EFF-National-Help-Desk-Volunteer-${profile.certificate_number}.pdf"`,
    "Cache-Control":"private, no-store",
  }});
}
