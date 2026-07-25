"use server";

import {redirect} from "next/navigation";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";
import {emailFrom, getResend} from "@/lib/email";
import {
  FIRST_GEN_FAMILY_NAVIGATOR_COURSE_ID,
  FIRST_GEN_FAMILY_NAVIGATOR_PASSING_SCORE,
  firstGenFamilyNavigatorFinalQuestions,
} from "@/lib/academy/first-gen-family-navigator";

export async function submitFirstGenFamilyNavigatorAssessment(formData: FormData) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user?.email) redirect("/sign-in?next=/academy/first-gen-family-navigator");

  if (formData.get("honor") !== "on") {
    redirect("/academy/first-gen-family-navigator?result=retry&score=0");
  }

  const correct = firstGenFamilyNavigatorFinalQuestions.reduce((total, question) => {
    const answer = Number(formData.get(`question_${question.id}`));
    return total + (Number.isInteger(answer) && answer === question.correctIndex ? 1 : 0);
  }, 0);
  const score = Math.round((correct / firstGenFamilyNavigatorFinalQuestions.length) * 100);
  if (score < FIRST_GEN_FAMILY_NAVIGATOR_PASSING_SCORE) {
    redirect(`/academy/first-gen-family-navigator?result=retry&score=${score}`);
  }

  const admin = createAdminClient();
  const {data: existing} = await admin
    .from("academy_course_completions")
    .select("certificate_code")
    .eq("user_id", user.id)
    .eq("course_id", FIRST_GEN_FAMILY_NAVIGATOR_COURSE_ID)
    .maybeSingle();
  const certificateCode = existing?.certificate_code
    ?? `EFF-FGFN-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  const {error} = await admin.from("academy_course_completions").upsert({
    user_id: user.id,
    course_id: FIRST_GEN_FAMILY_NAVIGATOR_COURSE_ID,
    course_version: 1,
    score,
    certificate_code: certificateCode,
    completed_at: new Date().toISOString(),
  }, {onConflict: "user_id,course_id"});
  if (error) throw new Error("Your passing score could not be recorded. Please try again.");

  const certificateUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.estherfundsfoundation.org"}/academy/first-gen-family-navigator/complete`;
  try {
    await getResend().emails.send({
      from: emailFrom,
      to: user.email,
      subject: "You earned your EFF First-Generation Family Navigator certificate",
      html: `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#2b1740"><h1 style="color:#42127F">Course completed</h1><p>Congratulations! You passed the EFF First-Generation Family Navigator course with a score of <strong>${score}%</strong>.</p><p>Your certificate code is <strong>${certificateCode}</strong>.</p><p>Open your certificate page, enter your name exactly as you want it printed, and download your professional PDF.</p><p><a href="${certificateUrl}" style="display:inline-block;background:#42127F;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">Create my certificate</a></p><p>This EFF credential recognizes completion of family-navigation training. It is not professional licensure or authority to act as a college employee, counselor, attorney, or financial-aid administrator.</p></div>`,
      text: `Congratulations! You passed the EFF First-Generation Family Navigator course with a score of ${score}%. Certificate code: ${certificateCode}. Enter your certificate name and download your PDF: ${certificateUrl}\n\nThis is an EFF course-completion credential, not professional licensure.`,
    });
  } catch (deliveryError) {
    console.error("Family Navigator completion email could not be sent", deliveryError);
  }

  redirect("/academy/first-gen-family-navigator/complete");
}
