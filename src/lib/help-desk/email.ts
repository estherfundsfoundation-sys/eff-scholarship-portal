import {emailFrom, getResend} from "@/lib/email";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.estherfundsfoundation.org";
const escapeHtml = (value:string) => value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"','&quot;').replaceAll("'","&#039;");
const wrap = (title: string, body: string, buttonLabel: string, href: string) =>
  `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#2d1748;max-width:640px;margin:auto"><div style="border-top:8px solid #42127F;background:#F5F0E6;padding:28px"><p style="color:#42127F;font-weight:700;letter-spacing:.08em">ESTHER FUNDS FOUNDATION</p><h1 style="color:#2B0A63">${title}</h1>${body}<p><a href="${href}" style="display:inline-block;background:#42127F;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">${buttonLabel}</a></p><p style="font-size:13px;color:#665a72">For privacy, this email does not include the conversation. Open the secure EFF portal to read or reply.</p></div></div>`;

export async function sendSecureCaseNotification(to: string, caseCode: string, token: string, subject: string) {
  const href = `${appUrl}/help-desk/case/${encodeURIComponent(caseCode)}?token=${encodeURIComponent(token)}`;
  return getResend().emails.send({
    from: emailFrom,
    to,
    subject,
    html: wrap("A secure Help Desk update is ready", `<p>Your EFF National Help Desk case <strong>${caseCode}</strong> has an update.</p>`, "Open my secure case", href),
    text: `Your EFF National Help Desk case ${caseCode} has an update. Open the secure case: ${href}\n\nFor privacy, this email does not include the conversation.`,
  });
}

export async function sendVolunteerQueueNotification(to: string) {
  const href = `${appUrl}/help-desk/volunteer/desk`;
  return getResend().emails.send({
    from: emailFrom,
    to,
    subject: "A student is waiting in the EFF National Help Desk",
    html: wrap("A student is waiting", "<p>A verified student request is available in the volunteer queue. Sign in only if you can actively serve. Student details remain inside the secure desk.</p>", "Open volunteer desk", href),
    text: `A verified student request is waiting. Open the secure volunteer desk only if you can actively serve: ${href}`,
  });
}

export async function sendLeadershipAlert(caseCode: string, reason: string) {
  const href = `${appUrl}/admin/student-help/${encodeURIComponent(caseCode)}`;
  return getResend().emails.send({
    from: emailFrom,
    to: "nationals@estherfundsinc.org",
    subject: `National Help Desk escalation â€” ${caseCode}`,
    html: wrap("Leadership review required", `<p>Case <strong>${caseCode}</strong> triggered a secure escalation.</p><p><strong>Reason:</strong> ${escapeHtml(reason)}</p><p>Open the protected admin record for the transcript and controls.</p>`, "Review secure case", href),
    text: `National Help Desk case ${caseCode} requires leadership review.\nReason: ${reason}\nReview securely: ${href}\n\nStudent details are intentionally omitted from this notification.`,
  });
}

export async function sendServiceReceipt(to: string, displayName: string, caseCode: string, minutes: number, totalMinutes: number) {
  const href = `${appUrl}/help-desk/volunteer/desk`;
  const total = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
  return getResend().emails.send({
    from: emailFrom,
    to,
    subject: `EFF service record: ${minutes} minutes credited`,
    html: wrap("Your service was recorded", `<p>Thank you, ${escapeHtml(displayName)}. EFF credited <strong>${minutes} service minutes</strong> for your completed work on case ${caseCode}.</p><p>Your recorded National Help Desk total is <strong>${total}</strong>. Records are based on documented conversation activity and may be reviewed for accuracy.</p>`, "View volunteer desk", href),
    text: `Thank you, ${escapeHtml(displayName)}. EFF credited ${minutes} service minutes for case ${caseCode}. Your recorded Help Desk total is ${total}. View your desk: ${href}`,
  });
}
