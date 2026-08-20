import {NextRequest, NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {emailFrom, getResend} from "@/lib/email";
import {
  nameYourNeedReceiptTemplateKey,
  renderNameYourNeedReceiptFallback,
} from "@/lib/name-your-need-receipt";

function escapeHtml(value: string) {return value.replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]!));}
const sleep = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));
const quotaErrors = new Set(["daily_quota_exceeded", "monthly_quota_exceeded"]);
const rateLimitErrors = new Set(["rate_limit_exceeded", "too_many_requests"]);

type DigestMatch={title:string;path:string;amount?:string|null;deadline?:string|null;reasons?:string[]};
type DigestResource={title:string;url:string;category:string};
type EmailPayload = {name?: string; claim_url?: string; status?: string; message?: string; item?: string; due_at?: string | null; amount?: number | string | null; acceptance_deadline?: string | null; application_path?: string; acceptance_path?: string; title?:string; deadline?:string|null; scholarship_path?:string;matches?:DigestMatch[];resources?:DigestResource[]};
function renderMessage(templateKey: string, payload: EmailPayload) {
  const site = "https://portal.estherfundsfoundation.org";
  const plainName = payload.name ?? "Applicant";
  const name = escapeHtml(plainName);
  const portalUrl = `${site}${payload.application_path ?? "/dashboard"}`;
  const button = `<p><a href="${escapeHtml(portalUrl)}" style="display:inline-block;background:#42127f;color:#fff;padding:12px 18px;text-decoration:none;border-radius:6px">Open your secure portal</a></p>`;
  if (templateKey === nameYourNeedReceiptTemplateKey) return renderNameYourNeedReceiptFallback(plainName, portalUrl);
  if (templateKey === "legacy_claim" && payload.claim_url) return {subject: "Your EFF Name Your Need application is ready to claim", html: `<p>Hello ${name},</p><p>Esther Funds Foundation has securely moved the Name Your Need Scholarship application you already submitted into our new portal.</p><p><a href="${escapeHtml(payload.claim_url)}">Create or sign in to your account and claim your existing application</a>.</p><p>This single-use private link expires in 14 days. New applications must be completed directly in the Esther Funds Foundation Portal.</p>`};
  if (templateKey === "information_request") return {subject: "EFF needs additional information for your application", html: `<p>Hello ${name},</p><p>Our team needs the following item to continue reviewing your application:</p><blockquote>${escapeHtml(payload.item ?? "Please review the request in your portal.")}</blockquote>${payload.due_at ? `<p>Please respond by ${escapeHtml(new Date(payload.due_at).toLocaleDateString("en-US"))}.</p>` : ""}${button}`};
  if (templateKey === "award_issued") return {subject: "Your EFF award details are ready", html: `<p>Hello ${name},</p><p>Your award details are available in the secure portal${payload.amount ? ` in the amount of <strong>$${escapeHtml(Number(payload.amount).toLocaleString("en-US", {minimumFractionDigits: 2}))}</strong>` : ""}.</p>${payload.acceptance_deadline ? `<p>Please respond by ${escapeHtml(new Date(`${payload.acceptance_deadline}T12:00:00`).toLocaleDateString("en-US"))}.</p>` : ""}${button}`};
  if (templateKey === "award_accepted") return {subject: "Your EFF award acceptance is confirmed", html: `<p>Hello ${name},</p><p>We recorded your award acceptance. Thank you for completing this step.</p>${button}`};
  if (templateKey === "scholarship_reminder") {const scholarshipUrl=`${site}${payload.scholarship_path??"/scholarships"}`;return {subject:`Scholarship deadline reminder: ${payload.title??"saved opportunity"}`,html:`<p>Hello ${name},</p><p>This is your reminder that <strong>${escapeHtml(payload.title??"a saved scholarship")}</strong>${payload.deadline?` has a listed deadline of ${escapeHtml(new Date(`${payload.deadline}T12:00:00`).toLocaleDateString("en-US"))}`:" may be closing soon"}.</p><p><a href="${escapeHtml(scholarshipUrl)}">Review the opportunity and verify details with the provider</a>.</p>`};}
  if(templateKey==="weekly_scholarship_matches"){const rows=(payload.matches??[]).slice(0,10).map(item=>`<li style="margin-bottom:16px"><a href="${escapeHtml(`${site}${item.path}`)}"><strong>${escapeHtml(item.title)}</strong></a>${item.amount?` · ${escapeHtml(item.amount)}`:""}${item.deadline?` · due ${escapeHtml(new Date(`${item.deadline}T12:00:00`).toLocaleDateString("en-US"))}`:""}${item.reasons?.length?`<br><span>${escapeHtml(item.reasons.slice(0,2).join(" "))}</span>`:""}</li>`).join("");const resourceRows=(payload.resources??[]).slice(0,4).map(item=>`<li><a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a> · ${escapeHtml(item.category.replaceAll("_"," "))}</li>`).join("");return{subject:"Your weekly EFF scholarship matches",html:`<p>Hello ${name},</p><p>EFF found current opportunities that may fit the private profile you created.</p><ol>${rows}</ol>${resourceRows?`<h2>Official support resources</h2><ul>${resourceRows}</ul>`:""}<p><a href="${site}/scholarships/matches">Review all matches and confirm every requirement with the provider</a>.</p><p>A match is guidance, not a guarantee of eligibility, selection, funding, availability, or an award. You can change weekly email preferences in your matching quiz.</p>`};}
  if (templateKey === "draft_reminder") return {subject:"A gentle reminder: your EFF application is waiting",html:`<p>Hello ${name},</p><p>We know scholarship applications can feel heavy. Your application is safely saved, and you can return when you are ready.</p>${button}`};
  if (templateKey === "information_request_reminder") return {subject:"Reminder: information is needed for your EFF application",html:`<p>Hello ${name},</p><p>This is a gentle reminder that EFF needs the following item:</p><blockquote>${escapeHtml(payload.item??"Please review the request in your portal.")}</blockquote>${payload.due_at?`<p>Please respond by ${escapeHtml(new Date(payload.due_at).toLocaleDateString("en-US"))}.</p>`:""}${button}`};
  return {subject: payload.status ? `EFF update: ${payload.status}` : "An update is available in your EFF portal", html: `<p>Hello ${name},</p><p>${escapeHtml(payload.message ?? "An update is available for your application.")}</p>${button}`};
}
function applyTemplate(value:string,payload:EmailPayload,site:string){const portalUrl=`${site}${payload.application_path??"/dashboard"}`;const vars:Record<string,string>={name:payload.name??"Applicant",claim_url:payload.claim_url??portalUrl,status:payload.status??"Application update",message:payload.message??"An update is available for your application.",item:payload.item??"Please review the request in your portal.",due_message:payload.due_at?`Please respond by ${new Date(payload.due_at).toLocaleDateString("en-US")}.`:payload.acceptance_deadline?`Please respond by ${new Date(`${payload.acceptance_deadline}T12:00:00`).toLocaleDateString("en-US")}.`:"",amount_message:payload.amount?`Approved amount: $${Number(payload.amount).toLocaleString("en-US",{minimumFractionDigits:2})}.`:"",portal_url:portalUrl,acceptance_url:`${site}${payload.acceptance_path??payload.application_path??"/dashboard"}`,title:payload.title??"saved opportunity",deadline_message:payload.deadline?`has a listed deadline of ${new Date(`${payload.deadline}T12:00:00`).toLocaleDateString("en-US")}`:"may be closing soon",scholarship_url:`${site}${payload.scholarship_path??"/scholarships"}`};return value.replace(/\{\{([a-z_]+)\}\}/g,(_match,key:string)=>escapeHtml(vars[key]??""));}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({error: "Unauthorized"}, {status: 401});
  const db = createAdminClient();
  const resend = getResend();
  await db.rpc("queue_due_scholarship_reminders", {p_limit: 100});
  await db.rpc("queue_student_lifecycle_reminders", {p_limit: 200});
  const {data:templates}=await db.from("email_templates").select("event_key,subject,body,version").is("program_id",null).order("version",{ascending:false});
  const {data: messages, error} = await db.rpc("dequeue_email_messages", {p_limit: 25});
  if (error) return NextResponse.json({error: "Queue unavailable"}, {status: 500});
  let sentCount = 0;
  let rateLimitedCount = 0;
  for (const [index, message] of (messages ?? []).entries()) {
    // Resend rate limits apply across the entire team. Keep this worker below even
    // the lower legacy limit so password resets and other services retain capacity.
    if (index > 0) await sleep(650);
    const payload = message.payload_private as EmailPayload | null;
    if (!payload) {
      await db.from("messages").update({status:"failed",last_error_safe:"This queued email is missing its secure delivery data."}).eq("id",message.message_id).eq("status","processing");
      continue;
    }
    const templateKey=message.template_key??"legacy_claim";const configured=templates?.find(t=>t.event_key===templateKey);const site="https://portal.estherfundsfoundation.org";const rendered=templateKey==="weekly_scholarship_matches"?renderMessage(templateKey,payload):configured?{subject:applyTemplate(configured.subject,payload,site),html:applyTemplate(configured.body,payload,site)}:renderMessage(templateKey,payload);
    const result = await resend.emails.send({
      from: emailFrom,
      to: message.recipient,
      replyTo: templateKey === "partner_invitation" || templateKey === nameYourNeedReceiptTemplateKey ? "nationals@estherfundsinc.org" : undefined,
      subject: rendered.subject,
      html: `${rendered.html}<p>Questions? Contact <a href="mailto:nationals@estherfundsinc.org">nationals@estherfundsinc.org</a>.</p>`,
    });
    if (!result.error) {
      const now = new Date().toISOString();
      await db.from("messages").update({status: "sent", provider_id: result.data?.id, sent_at: now, payload_private: null, attempts: message.attempts + 1}).eq("id", message.message_id).eq("status", "processing");
      if (templateKey === nameYourNeedReceiptTemplateKey) await db.from("audit_events").insert({actor_id:null,action:"name_your_need_receipt_accepted_by_provider",target_type:"message",target_id:message.message_id,metadata_safe:{provider:"resend"}});
      if (message.legacy_token_id) await db.from("legacy_claim_tokens").update({sent_at: now}).eq("id", message.legacy_token_id);
      sentCount += 1;
    } else if (quotaErrors.has(result.error.name)) {
      await db.from("messages").update({status:"queued",next_attempt_at:new Date(Date.now()+12*60*60*1000).toISOString(),last_error_safe:"Email service quota reached; delivery is safely paused and will retry."}).eq("id",message.message_id).eq("status","processing");
    } else if (rateLimitErrors.has(result.error.name)) {
      // A 429 is temporary and must never consume the message's failure budget.
      await db.from("messages").update({status:"queued",next_attempt_at:new Date(Date.now()+2*60*1000).toISOString(),last_error_safe:"Email delivery is briefly paced and will retry automatically."}).eq("id",message.message_id).eq("status","processing");
      rateLimitedCount += 1;
    } else {
      const attempts = message.attempts + 1;
      const delayMinutes = Math.min(360, 2 ** Math.min(attempts, 8));
      await db.from("messages").update({status: attempts >= 8 ? "failed" : "queued", attempts, next_attempt_at: new Date(Date.now() + delayMinutes * 60000).toISOString(), last_error_safe: "Email provider rejected this delivery attempt."}).eq("id", message.message_id).eq("status", "processing");
    }
  }
  return NextResponse.json({processed: messages?.length ?? 0, sent: sentCount, rateLimited: rateLimitedCount});
}

export const maxDuration = 60;
