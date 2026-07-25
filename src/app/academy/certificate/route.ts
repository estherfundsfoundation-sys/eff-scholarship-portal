import {readFile} from "node:fs/promises";
import path from "node:path";
import {NextResponse} from "next/server";
import {PDFDocument, StandardFonts, rgb} from "pdf-lib";
import {createClient} from "@/lib/supabase/server";
import {FINANCIAL_AID_PEER_MENTOR_COURSE_ID} from "@/lib/academy/financial-aid-peer-mentor";

function centeredX(
  text: string,
  font: {widthOfTextAtSize(text: string, size: number): number},
  size: number,
  pageWidth: number,
) {
  return (pageWidth - font.widthOfTextAtSize(text, size)) / 2;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/sign-in?next=/academy/financial-aid-peer-mentor/complete", request.url));
  }
  const [{data: completion}, {data: profile}] = await Promise.all([
    supabase.from("academy_course_completions").select("score,completed_at,certificate_code").eq("user_id", user.id).eq("course_id", FINANCIAL_AID_PEER_MENTOR_COURSE_ID).maybeSingle(),
    supabase.from("profiles").select("legal_name,preferred_name").eq("id", user.id).single(),
  ]);
  if (!completion) return new NextResponse("Complete the course before downloading a certificate.", {status: 403});

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([792, 612]);
  const width = page.getWidth();
  const height = page.getHeight();
  const purple = rgb(0.259, 0.071, 0.498);
  const deepPurple = rgb(0.149, 0.024, 0.353);
  const lavender = rgb(0.718, 0.6, 0.89);
  const cream = rgb(0.961, 0.941, 0.902);
  const ink = rgb(0.129, 0.086, 0.173);
  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({x: 0, y: 0, width, height, color: cream});
  page.drawRectangle({x: 18, y: 18, width: width - 36, height: height - 36, borderColor: purple, borderWidth: 5});
  page.drawRectangle({x: 29, y: 29, width: width - 58, height: height - 58, borderColor: lavender, borderWidth: 1.5});
  page.drawRectangle({x: 0, y: height - 88, width, height: 88, color: deepPurple});

  try {
    const logo = await readFile(path.join(process.cwd(), "public", "brand", "eff-logo.png"));
    const embeddedLogo = await pdf.embedPng(logo);
    const dimensions = embeddedLogo.scaleToFit(66, 66);
    page.drawImage(embeddedLogo, {x: 42, y: height - 77, width: dimensions.width, height: dimensions.height});
  } catch {
    // The certificate remains valid and branded if the optional logo asset is unavailable.
  }

  const academy = "ESTHER FUNDS FOUNDATION LEADERSHIP TRAINING ACADEMY";
  page.drawText(academy, {x: centeredX(academy, sansBold, 13, width) + 26, y: height - 51, size: 13, font: sansBold, color: rgb(1, 1, 1)});
  const certificateTitle = "Certificate of Course Completion";
  page.drawText(certificateTitle, {x: centeredX(certificateTitle, serifItalic, 30, width), y: 447, size: 30, font: serifItalic, color: purple});
  const certifies = "This certifies that";
  page.drawText(certifies, {x: centeredX(certifies, sans, 13, width), y: 407, size: 13, font: sans, color: ink});

  const name = profile?.legal_name || profile?.preferred_name || user.email || "EFF Learner";
  let nameSize = 34;
  while (sansBold.widthOfTextAtSize(name, nameSize) > 650 && nameSize > 20) nameSize -= 1;
  page.drawText(name, {x: centeredX(name, sansBold, nameSize, width), y: 351, size: nameSize, font: sansBold, color: deepPurple});
  page.drawLine({start: {x: 120, y: 340}, end: {x: width - 120, y: 340}, thickness: 1, color: lavender});

  const completed = "has successfully completed the requirements for";
  page.drawText(completed, {x: centeredX(completed, sans, 13, width), y: 305, size: 13, font: sans, color: ink});
  const course = "EFF FINANCIAL AID PEER MENTOR";
  page.drawText(course, {x: centeredX(course, sansBold, 26, width), y: 255, size: 26, font: sansBold, color: purple});
  const result = `Passing score: ${completion.score}%  |  Completed ${new Date(completion.completed_at).toLocaleDateString("en-US", {month: "long", day: "numeric", year: "numeric"})}`;
  page.drawText(result, {x: centeredX(result, sans, 12, width), y: 218, size: 12, font: sans, color: ink});

  page.drawLine({start: {x: 170, y: 146}, end: {x: 350, y: 146}, thickness: 1, color: purple});
  page.drawText("Shayna Vincent, Founder & CEO", {x: 181, y: 129, size: 10, font: sansBold, color: ink});
  page.drawLine({start: {x: 444, y: 146}, end: {x: 624, y: 146}, thickness: 1, color: purple});
  page.drawText("EFF Leadership Training Academy", {x: 454, y: 129, size: 10, font: sansBold, color: ink});
  page.drawText(`Certificate ${completion.certificate_code}`, {x: 48, y: 55, size: 8, font: sans, color: purple});
  const disclaimer = "EFF course-completion credential; not a U.S. Department of Education certification or financial-aid administrator license.";
  page.drawText(disclaimer, {x: width - sans.widthOfTextAtSize(disclaimer, 7.5) - 48, y: 55, size: 7.5, font: sans, color: ink});

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="EFF-Financial-Aid-Peer-Mentor-${completion.certificate_code}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
