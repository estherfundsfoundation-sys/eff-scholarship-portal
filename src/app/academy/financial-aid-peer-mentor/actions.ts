"use server";

import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {emailFrom, getResend} from "@/lib/email";
import {
  FINANCIAL_AID_PEER_MENTOR_COURSE_ID,
  FINANCIAL_AID_PEER_MENTOR_PASSING_SCORE,
  financialAidPeerMentorFinalQuestions,
} from "@/lib/academy/financial-aid-peer-mentor";

export async function submitFinancialAidPeerMentorAssessment(formData: FormData) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user?.email) redirect("/sign-in?next=/academy/financial-aid-peer-mentor");

  if (formData.get("honor") !== "on") {
    redirect("/academy/financial-aid-peer-mentor?result=retry&score=0");
  }

  const correct = financialAidPeerMentorFinalQuestions.reduce((total, question) => {
    const answer = Number(formData.get(`question_${question.id}`));
    return total + (Number.isInteger(answer) && answer === question.correctIndex ? 1 : 0);
  }, 0);
  const score = Math.round((correct / financialAidPeerMentorFinalQuestions.length) * 100);

  if (score < FINANCIAL_AID_PEER_MENTOR_PASSING_SCORE) {
    redirect(`/academy/financial-aid-peer-mentor?result=retry&score=${score}`);
  }

  const admin = createAdminClient();
  const {data: existing} = await admin
    .from("academy_course_completions")
    .select("certificate_code")
    .eq("user_id", user.id)
    .eq("course_id", FINANCIAL_AID_PEER_MENTOR_COURSE_ID)
    .maybeSingle();
  const certificateCode = existing?.certificate_code ?? `EFF-FAPM-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  const {error} = await admin.from("academy_course_completions").upsert({
    user_id: user.id,
    course_id: FINANCIAL_AID_PEER_MENTOR_COURSE_ID,
    course_version: 1,
    score,
    certificate_code: certificateCode,
    completed_at: new Date().toISOString(),
  }, {onConflict: "user_id,course_id"});
  if (error) throw new Error("Your passing score could not be recorded. Please try again.");

  const certificateUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.estherfundsfoundation.org"}/academy/financial-aid-peer-mentor/complete`;
  try {
    await getResend().emails.send({
      from: emailFrom,
      to: user.email,
      subject: "You earned your EFF Financial Aid Peer Mentor certificate",
      html: `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#2b1740"><h1 style="color:#42127F">Course completed</h1><p>Congratulations! You passed the EFF Financial Aid Peer Mentor course with a score of <strong>${score}%</strong>.</p><p>Your certificate code is <strong>${certificateCode}</strong>.</p><p>Open your certificate page, enter your name exactly as you want it printed, and download your professional PDF.</p><p><a href="${certificateUrl}" style="display:inline-block;background:#42127F;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">Create my certificate</a></p><p>This certificate recognizes completion of an Esther Funds Foundation peer-navigation curriculum. It is not a federal credential or authorization to act as a financial-aid administrator.</p></div>`,
      text: `Congratulations! You passed the EFF Financial Aid Peer Mentor course with a score of ${score}%. Certificate code: ${certificateCode}. Enter your certificate name and download your professional PDF: ${certificateUrl}\n\nThis is an EFF course-completion credential, not a federal credential or authorization to act as a financial-aid administrator.`,
    });
  } catch (deliveryError) {
    console.error("Academy completion email could not be sent", deliveryError);
  }

  redirect("/academy/financial-aid-peer-mentor/complete");
}
