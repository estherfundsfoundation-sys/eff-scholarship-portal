import {NextRequest, NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {emailFrom, getResend} from "@/lib/email";

function escapeHtml(value: string) {return value.replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]!));}

type EmailPayload = {name?: string; claim_url?: string; status?: string; message?: string; item?: string; due_at?: string | null; amount?: number | string | null; acceptance_deadline?: string | null; application_path?: string};
function renderMessage(templateKey: string, payload: EmailPayload) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://he-flame.vercel.app").replace(/\/$/, "");
  const name = escapeHtml(payload.name ?? "Applicant");
  const portalUrl = `${site}${payload.application_path ?? "/dashboard"}`;
  const button = `<p><a href="${escapeHtml(portalUrl)}" style="display:inline-block;background:#42127f;color:#fff;padding:12px 18px;text-decoration:none;border-radius:6px">Open your secure portal</a></p>`;
  if (templateKey === "legacy_claim" && payload.claim_url) return {subject: "Your EFF Name Your Need application is ready to claim", html: `<p>Hello ${name},</p><p>Esther Funds Foundation has securely moved the Name Your Need Scholarship application you already submitted into our new portal.</p><p><a href="${escapeHtml(payload.claim_url)}">Create or sign in to your account and claim your existing application</a>.</p><p>This single-use private link expires in 14 days. New applications must be completed directly in the EFF Scholarship Portal.</p>`};
  if (templateKey === "information_request") return {subject: "EFF needs additional information for your application", html: `<p>Hello ${name},</p><p>Our team needs the following item to continue reviewing your application:</p><blockquote>${escapeHtml(payload.item ?? "Please review the request in your portal.")}</blockquote>${payload.due_at ? `<p>Please respond by ${escapeHtml(new Date(payload.due_at).toLocaleDateString("en-US"))}.</p>` : ""}${button}`};
  if (templateKey === "award_issued") return {subject: "Your EFF award details are ready", html: `<p>Hello ${name},</p><p>Your award details are available in the secure portal${payload.amount ? ` in the amount of <strong>$${escapeHtml(Number(payload.amount).toLocaleString("en-US", {minimumFractionDigits: 2}))}</strong>` : ""}.</p>${payload.acceptance_deadline ? `<p>Please respond by ${escapeHtml(new Date(`${payload.acceptance_deadline}T12:00:00`).toLocaleDateString("en-US"))}.</p>` : ""}${button}`};
  if (templateKey === "award_accepted") return {subject: "Your EFF award acceptance is confirmed", html: `<p>Hello ${name},</p><p>We recorded your award acceptance. Thank you for completing this step.</p>${button}`};
  return {subject: payload.status ? `EFF update: ${payload.status}` : "An update is available in your EFF portal", html: `<p>Hello ${name},</p><p>${escapeHtml(payload.message ?? "An update is available for your application.")}</p>${button}`};
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({error: "Unauthorized"}, {status: 401});
  const db = createAdminClient();
  const resend = getResend();
  const {data: messages, error} = await db.rpc("dequeue_email_messages", {p_limit: 25});
  if (error) return NextResponse.json({error: "Queue unavailable"}, {status: 500});
  let sentCount = 0;
  for (const message of messages ?? []) {
    const payload = message.payload_private as EmailPayload | null;
    if (!payload) continue;
    const rendered = renderMessage(message.template_key ?? "legacy_claim", payload);
    const result = await resend.emails.send({
      from: emailFrom,
      to: message.recipient,
      subject: rendered.subject,
      html: `${rendered.html}<p>Questions? Contact <a href="mailto:nationals@estherfundsinc.org">nationals@estherfundsinc.org</a>.</p>`,
    });
    if (!result.error) {
      const now = new Date().toISOString();
      await db.from("messages").update({status: "sent", provider_id: result.data?.id, sent_at: now, payload_private: null, attempts: message.attempts + 1}).eq("id", message.message_id).eq("status", "processing");
      if (message.legacy_token_id) await db.from("legacy_claim_tokens").update({sent_at: now}).eq("id", message.legacy_token_id);
      sentCount += 1;
    } else {
      const attempts = message.attempts + 1;
      const delayMinutes = Math.min(360, 2 ** Math.min(attempts, 8));
      await db.from("messages").update({status: attempts >= 8 ? "failed" : "queued", attempts, next_attempt_at: new Date(Date.now() + delayMinutes * 60000).toISOString(), last_error_safe: "Email provider rejected this delivery attempt."}).eq("id", message.message_id).eq("status", "processing");
    }
  }
  return NextResponse.json({processed: messages?.length ?? 0, sent: sentCount});
}
