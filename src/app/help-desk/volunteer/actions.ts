"use server";

import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {z} from "zod";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";
import {emailFrom, getResend} from "@/lib/email";
import {requireHelpDeskVolunteer} from "@/lib/help-desk/auth";
import {helpDeskTrainingQuestions, HELP_DESK_PASSING_SCORE, HELP_DESK_TRAINING_VERSION} from "@/lib/help-desk/training";
import {sendServiceReceipt} from "@/lib/help-desk/email";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.estherfundsfoundation.org";

export async function beginVolunteerTraining(formData: FormData) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user?.email) redirect("/sign-in?next=/help-desk/volunteer");
  const displayName = z.string().trim().min(2).max(100).parse(formData.get("displayName"));
  if (formData.get("agreement") !== "on") redirect("/help-desk/volunteer?error=agreement");
  const admin = createAdminClient();
  const {error} = await admin.from("help_desk_volunteer_profiles").upsert({
    user_id: user.id,
    display_name: displayName,
    notification_email: user.email,
    agreement_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, {onConflict: "user_id"});
  if (error) throw new Error("Volunteer onboarding could not be saved.");
  redirect("/help-desk/volunteer/training");
}

export async function submitHelpDeskTraining(formData: FormData) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user?.email) redirect("/sign-in?next=/help-desk/volunteer/training");
  const admin = createAdminClient();
  const {data: profile} = await admin.from("help_desk_volunteer_profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (!profile || !profile.agreement_at) redirect("/help-desk/volunteer");
  if (profile.status === "revoked") redirect("/help-desk/volunteer?access=revoked");
  if (formData.get("honor") !== "on") redirect("/help-desk/volunteer/training?result=retry&score=0");

  const answers: Record<string, number> = {};
  let correct = 0;
  for (const question of helpDeskTrainingQuestions) {
    const answer = Number(formData.get(`question_${question.id}`));
    answers[question.id] = answer;
    if (Number.isInteger(answer) && answer === question.correctIndex) correct++;
  }
  const score = Math.round((correct / helpDeskTrainingQuestions.length) * 100);
  const passed = score === HELP_DESK_PASSING_SCORE;
  await admin.from("help_desk_training_attempts").insert({
    user_id: user.id,
    score,
    correct_answers: correct,
    total_questions: helpDeskTrainingQuestions.length,
    passed,
    answer_summary: {version: HELP_DESK_TRAINING_VERSION, answers},
  });
  if (!passed) redirect(`/help-desk/volunteer/training?result=retry&score=${score}`);

  const certificate = profile.certificate_number ?? `EFF-NHD-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const now = new Date().toISOString();
  const {error} = await admin.from("help_desk_volunteer_profiles").update({
    status: "certified",
    training_score: 100,
    trained_at: now,
    certificate_number: certificate,
    updated_at: now,
  }).eq("user_id", user.id);
  if (error) throw new Error("Your passing score could not be recorded.");

  try {
    await getResend().emails.send({
      from: emailFrom,
      to: user.email,
      subject: "You are trained for the EFF National Help Desk",
      html: `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#2d1748;max-width:640px;margin:auto"><h1 style="color:#42127F">100% — training complete</h1><p>Congratulations, ${profile.display_name}. You completed the EFF National Help Desk Volunteer training and passed every safety, resource, privacy, and escalation question.</p><p><strong>Certificate: ${certificate}</strong></p><p><a href="${appUrl}/help-desk/volunteer/certificate" style="display:inline-block;background:#42127F;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Download certificate</a> <a href="${appUrl}/help-desk/volunteer/desk" style="display:inline-block;border:2px solid #42127F;color:#42127F;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700">Open volunteer desk</a></p><p>Your access remains subject to EFF privacy, safety, and volunteer standards.</p></div>`,
      text: `Congratulations, ${profile.display_name}. You passed the EFF National Help Desk Volunteer training with 100%. Certificate: ${certificate}\nDownload: ${appUrl}/help-desk/volunteer/certificate\nVolunteer desk: ${appUrl}/help-desk/volunteer/desk`,
    });
  } catch (error) {
    console.error("Volunteer certification email failed", error);
  }
  redirect("/help-desk/volunteer/desk?welcome=1");
}

export async function startHelpDeskShift(formData: FormData) {
  const {user, admin} = await requireHelpDeskVolunteer();
  const minutes = z.coerce.number().refine(value => [10,15,30,60].includes(value)).parse(formData.get("minutes"));
  const now = new Date();
  await admin.from("help_desk_shifts").update({status:"ended", ended_at:now.toISOString()}).eq("volunteer_id", user.id).eq("status","active");
  await admin.from("help_desk_shifts").insert({
    volunteer_id: user.id,
    requested_minutes: minutes,
    ends_at: new Date(now.getTime() + minutes * 60_000).toISOString(),
  });
  await admin.from("help_desk_volunteer_profiles").update({last_active_at:now.toISOString(),updated_at:now.toISOString()}).eq("user_id", user.id);
  revalidatePath("/help-desk/volunteer/desk");
}

export async function endHelpDeskShift() {
  const {user, admin} = await requireHelpDeskVolunteer();
  const now = new Date().toISOString();
  await admin.from("help_desk_shifts").update({status:"ended",ended_at:now}).eq("volunteer_id",user.id).eq("status","active");
  revalidatePath("/help-desk/volunteer/desk");
}

export async function claimHelpDeskConversation(formData: FormData) {
  const {user, admin} = await requireHelpDeskVolunteer();
  const conversationId = z.string().uuid().parse(formData.get("conversationId"));
  const now = new Date();
  const {data: shift} = await admin.from("help_desk_shifts").select("id,ends_at").eq("volunteer_id", user.id).eq("status","active").gt("ends_at",now.toISOString()).order("started_at",{ascending:false}).limit(1).maybeSingle();
  if (!shift) throw new Error("Start an availability period before claiming a case.");
  const {data: claimed, error} = await admin.from("help_desk_conversations").update({
    assigned_volunteer_id:user.id,status:"assigned",assigned_at:now.toISOString(),updated_at:now.toISOString(),
  }).eq("id",conversationId).eq("status","unassigned").is("assigned_volunteer_id",null).select("id").maybeSingle();
  if (error || !claimed) throw new Error("Another volunteer already claimed this case.");
  await admin.from("help_desk_service_logs").insert({volunteer_id:user.id,conversation_id:conversationId,shift_id:shift.id});
  await admin.from("help_desk_shifts").update({conversations_claimed:1}).eq("id",shift.id);
  revalidatePath("/help-desk/volunteer/desk");
}

async function finalizeService(userId: string, conversationId: string, summary: string, closeConversation: boolean) {
  const admin = createAdminClient();
  const now = new Date();
  const [{data: log},{data: conversation},{data: profile}] = await Promise.all([
    admin.from("help_desk_service_logs").select("*").eq("volunteer_id",userId).eq("conversation_id",conversationId).is("ended_at",null).maybeSingle(),
    admin.from("help_desk_conversations").select("id,case_id,student_help_cases(case_code)").eq("id",conversationId).maybeSingle(),
    admin.from("help_desk_volunteer_profiles").select("display_name,notification_email").eq("user_id",userId).maybeSingle(),
  ]);
  if (!log || !conversation) throw new Error("No active service record was found.");
  const {count} = await admin.from("help_desk_messages").select("id",{count:"exact",head:true}).eq("conversation_id",conversationId).eq("sender_type","volunteer").eq("sender_user_id",userId).gte("created_at",log.started_at);
  const messageCount = count ?? 0;
  const elapsedMinutes = Math.max(0, Math.ceil((now.getTime() - new Date(log.started_at).getTime()) / 60_000));
  const credited = messageCount > 0 ? Math.min(60, Math.max(5, Math.ceil(elapsedMinutes / 5) * 5)) : 0;
  await admin.from("help_desk_service_logs").update({
    ended_at:now.toISOString(),minutes_credited:credited,volunteer_message_count:messageCount,closeout_summary:summary,
  }).eq("id",log.id);
  await admin.from("help_desk_conversations").update(closeConversation ? {
    status:"closed",closed_at:now.toISOString(),closed_by:userId,closed_reason:summary,updated_at:now.toISOString(),
  } : {
    status:"unassigned",assigned_volunteer_id:null,assigned_at:null,updated_at:now.toISOString(),
  }).eq("id",conversationId).eq("assigned_volunteer_id",userId);
  if (credited > 0 && profile?.notification_email) {
    const {data: totals} = await admin.from("help_desk_service_logs").select("minutes_credited").eq("volunteer_id",userId).not("ended_at","is",null);
    const total = (totals ?? []).reduce((sum,row)=>sum+(row.minutes_credited??0),0);
    const caseCode = (conversation.student_help_cases as unknown as {case_code:string})?.case_code ?? "secure case";
    try {
      await sendServiceReceipt(profile.notification_email, profile.display_name, caseCode, credited, total);
      await admin.from("help_desk_service_logs").update({receipt_emailed_at:new Date().toISOString()}).eq("id",log.id);
    } catch (error) {
      console.error("Service receipt failed", error);
    }
  }
}

export async function releaseHelpDeskConversation(formData: FormData) {
  const {user} = await requireHelpDeskVolunteer();
  const conversationId = z.string().uuid().parse(formData.get("conversationId"));
  const summary = z.string().trim().min(10).max(1000).parse(formData.get("summary"));
  await finalizeService(user.id, conversationId, summary, false);
  revalidatePath("/help-desk/volunteer/desk");
}

export async function closeHelpDeskConversation(formData: FormData) {
  const {user} = await requireHelpDeskVolunteer();
  const conversationId = z.string().uuid().parse(formData.get("conversationId"));
  const summary = z.string().trim().min(10).max(1000).parse(formData.get("summary"));
  await finalizeService(user.id, conversationId, summary, true);
  revalidatePath("/help-desk/volunteer/desk");
}
