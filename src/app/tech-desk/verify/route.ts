import {createHash} from "node:crypto";
import {NextRequest, NextResponse} from "next/server";
import {createTechAccessLink} from "@/lib/tech-desk-access";
import {deliverTechDeskEmail} from "@/lib/tech-desk-email";
import {diagnoseTechTicket} from "@/lib/tech-desk-monitor";
import {escapeHtml} from "@/lib/security";
import {createAdminClient} from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token || token.length < 30) {
    return NextResponse.redirect(
      new URL("/tech-desk/open-ticket?error=This+verification+link+is+invalid.", request.url),
    );
  }
  const admin = createAdminClient();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const {data: record} = await admin
    .from("tech_desk_tickets")
    .select(
      "id,ticket_code,requester_name,preferred_name,email,product_slug,issue_category,description,error_message,urgency,verified_at,verification_expires_at",
    )
    .eq("verification_token_hash", tokenHash)
    .maybeSingle();
  if (!record) {
    return NextResponse.redirect(
      new URL(
        "/tech-desk/open-ticket?error=This+verification+link+is+invalid+or+has+already+been+replaced.",
        request.url,
      ),
    );
  }
  if (
    !record.verified_at &&
    (!record.verification_expires_at ||
      new Date(record.verification_expires_at).valueOf() < Date.now())
  ) {
    return NextResponse.redirect(
      new URL(
        `/tech-desk/open-ticket?error=${encodeURIComponent(
          "This verification link expired. Open a new ticket or contact the Tech Desk with only your ticket number.",
        )}`,
        request.url,
      ),
    );
  }

  if (!record.verified_at) {
    const now = new Date().toISOString();
    await admin
      .from("tech_desk_tickets")
      .update({
        verified_at: now,
        status: "diagnosing",
        verification_token_hash: null,
        updated_at: now,
      })
      .eq("id", record.id);
    await admin.from("tech_desk_events").insert({
      ticket_id: record.id,
      event_type: "requester_email_verified",
      summary_safe: "The requester verified their email and safe diagnostics began.",
    });
  }

  let diagnosisResult:
    | Awaited<ReturnType<typeof diagnoseTechTicket>>
    | null = null;
  try {
    diagnosisResult = await diagnoseTechTicket(admin, record);
  } catch (error) {
    console.error("Tech Desk automatic diagnosis failed", error);
    await admin
      .from("tech_desk_tickets")
      .update({
        status: "staff_review",
        priority: record.urgency === "deadline_within_72_hours" ? "P1" : "P2",
        diagnosis_code: "DIAGNOSTIC_REVIEW",
        diagnosis_summary:
          "The safe automatic check could not finish, so the ticket moved to staff review.",
        recommended_steps: [
          "Keep this ticket number for every follow-up.",
          "Do not create a duplicate account or ticket.",
          "Do not send passwords, verification codes, or private financial information.",
        ],
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id);
    await admin.from("tech_desk_events").insert({
      ticket_id: record.id,
      event_type: "automatic_diagnosis_deferred",
      summary_safe: "Automatic diagnostics could not finish; staff review is required.",
    });
  }

  const accessLink = await createTechAccessLink(record);
  const diagnosis = diagnosisResult?.diagnosis;
  const publicHealth = diagnosisResult?.probe?.status ?? "unknown";
  const steps =
    diagnosis?.steps ?? [
      "Keep this ticket number for every follow-up.",
      "Do not create a duplicate account or ticket.",
      "Do not send passwords, verification codes, or private financial information.",
    ];
  try {
    await deliverTechDeskEmail({
      ticketId: record.id,
      eventKey: "initial_diagnosis",
      to: record.email,
      subject: `[EFF Tech Desk ${record.ticket_code}] Your Secure Diagnosis Is Ready`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#25143d;max-width:680px;margin:auto"><div style="background:#2b0a63;color:#fff;padding:26px"><strong>ESTHER FUNDS FOUNDATION</strong><h1 style="margin:8px 0 0">Your Tech Desk diagnosis</h1></div><div style="padding:28px;border:1px solid #ded1ef"><p>Hello ${escapeHtml(record.preferred_name || record.requester_name)},</p><p><strong>${escapeHtml(diagnosis?.title ?? "Your ticket is ready for staff review")}</strong></p><p>${escapeHtml(diagnosis?.summary ?? "The safe automatic check could not finish, so an authorized Tech Desk staff member will review the ticket.")}</p><p>Public platform health at the time of review: <strong>${escapeHtml(publicHealth)}</strong>.</p><ol>${steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol><p><a href="${accessLink.url}" style="display:inline-block;background:#42127f;color:#fff;padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:700">Open My Secure Ticket</a></p><p>This link expires in 30 minutes. Request another link from the Tech Desk access page if needed.</p><p>Never send EFF your password, verification code, private API key, Social Security number, or full bank details.</p><p>Esther Funds Foundation<br><em>Every Future Fulfilled.</em></p></div></div>`,
      text: `Hello ${record.preferred_name || record.requester_name},\n\nTicket ${record.ticket_code}\n\n${diagnosis?.title ?? "Your ticket is ready for staff review"}\n${diagnosis?.summary ?? "The safe automatic check could not finish, so an authorized Tech Desk staff member will review the ticket."}\n\n${steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}\n\nOpen your secure ticket: ${accessLink.url}\n\nNever send passwords or verification codes.`,
    });
    await admin.from("tech_desk_events").insert({
      ticket_id: record.id,
      event_type: "initial_diagnosis_email_sent",
      summary_safe: "The secure diagnosis and ticket-access email was accepted for delivery.",
    });
  } catch (error) {
    console.error("Tech Desk diagnosis email failed", error);
  }

  return NextResponse.redirect(accessLink.url);
}
