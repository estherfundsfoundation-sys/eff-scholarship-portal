import {NextRequest, NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {emailFrom, getResend} from "@/lib/email";

function escapeHtml(value: string) {return value.replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]!));}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({error: "Unauthorized"}, {status: 401});
  const db = createAdminClient();
  const resend = getResend();
  const {data: messages, error} = await db.rpc("dequeue_email_messages", {p_limit: 25});
  if (error) return NextResponse.json({error: "Queue unavailable"}, {status: 500});
  let sentCount = 0;
  for (const message of messages ?? []) {
    const payload = message.payload_private as {name?: string; claim_url?: string} | null;
    if (!payload?.claim_url) continue;
    const result = await resend.emails.send({
      from: emailFrom,
      to: message.recipient,
      subject: "Your EFF Name Your Need application is ready to claim",
      html: `<p>Hello ${escapeHtml(payload.name ?? "Applicant")},</p><p>Esther Funds Foundation has securely moved the Name Your Need Scholarship application you already submitted into our new portal.</p><p><a href="${escapeHtml(payload.claim_url)}">Create or sign in to your account and claim your existing application</a>.</p><p>This single-use private link expires in 14 days. New applications must be completed directly in the EFF Scholarship Portal.</p><p>Questions? Contact <a href="mailto:nationals@estherfundsinc.org">nationals@estherfundsinc.org</a>.</p>`,
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
