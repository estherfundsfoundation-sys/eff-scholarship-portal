"use server";

import {redirect} from "next/navigation";
import {emailFrom, getResend} from "@/lib/email";
import {requireReachAmbassador} from "@/lib/reach/ambassador";
import {
  REACH_AMBASSADOR_PASSING_SCORE,
  reachAmbassadorFinalQuestions,
} from "@/lib/reach/training";

export async function submitReachAmbassadorAssessment(formData: FormData) {
  const {admin, user, ambassador} = await requireReachAmbassador("/reach/ambassador/training");
  if (!ambassador) redirect("/reach/claim");

  if (formData.get("honor") !== "on") {
    redirect("/reach/ambassador/training?result=retry&score=0");
  }
  const correct = reachAmbassadorFinalQuestions.reduce((total, question) => {
    const answer = Number(formData.get(`question_${question.id}`));
    return total + (Number.isInteger(answer) && answer === question.correctIndex ? 1 : 0);
  }, 0);
  const score = Math.round((correct / reachAmbassadorFinalQuestions.length) * 100);
  const now = new Date().toISOString();

  if (score < REACH_AMBASSADOR_PASSING_SCORE) {
    await admin.from("reach_ambassadors").update({
      training_started_at: ambassador.training_started_at ?? now,
      training_score: score,
      updated_at: now,
    }).eq("id", ambassador.id);
    redirect(`/reach/ambassador/training?result=retry&score=${score}`);
  }

  const certificateCode = ambassador.certificate_code
    ?? `EFF-REACH-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const {error} = await admin.from("reach_ambassadors").update({
    training_started_at: ambassador.training_started_at ?? now,
    training_completed_at: now,
    training_score: score,
    certified_at: now,
    certificate_code: certificateCode,
    updated_at: now,
  }).eq("id", ambassador.id);
  if (error) throw new Error("Your passing score could not be recorded. Please try again.");

  await admin.from("audit_events").insert({
    actor_id: user.id,
    action: "reach_ambassador_certified",
    target_type: "reach_ambassador",
    target_id: ambassador.id,
    metadata_safe: {score, certificate_code: certificateCode},
  });

  try {
    await getResend().emails.send({
      from: emailFrom,
      to: ambassador.login_email || ambassador.email,
      replyTo: "nationals@estherfundsinc.org",
      subject: "You are a certified EFF REACH Campus Ambassador",
      html: `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#2b1740;max-width:680px;margin:auto">
        <div style="background:#42127F;color:white;padding:28px"><div style="font-size:13px;letter-spacing:.12em;color:#D8C3F1;font-weight:700">ESTHER FUNDS FOUNDATION</div><h1 style="margin:8px 0 0">REACH certification complete</h1></div>
        <div style="padding:28px;border:1px solid #ded2e8">
          <p>Congratulations, ${ambassador.full_name || "Ambassador"}! You passed the REACH Campus Ambassador course with a score of <strong>${score}%</strong>.</p>
          <p>Your certificate ID is <strong>${certificateCode}</strong>. Download your professional PDF certificate and official acceptance letter from your secure ambassador workspace.</p>
          <p><a href="https://portal.estherfundsfoundation.org/reach/ambassador" style="display:inline-block;background:#42127F;color:white;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">Open my ambassador workspace</a></p>
          <p>Continue using only approved materials. Do not create an EFF or REACH social-media page, group, fundraiser, branded account, or public statement without written National Office approval.</p>
          <p><strong>The REACH Team</strong><br/>Esther Funds Foundation</p>
        </div>
      </div>`,
      text: `Congratulations! You passed the EFF REACH Campus Ambassador course with a score of ${score}%. Certificate ID: ${certificateCode}. Download your certificate and acceptance letter in your secure workspace: https://portal.estherfundsfoundation.org/reach/ambassador`,
    });
  } catch (deliveryError) {
    console.error("REACH certification email could not be sent", deliveryError);
  }

  redirect("/reach/ambassador/training?result=passed");
}
