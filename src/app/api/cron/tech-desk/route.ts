import {NextRequest, NextResponse} from "next/server";
import {deliverTechDeskEmail} from "@/lib/tech-desk-email";
import {
  runTechSystemProbe,
  type TechDeskSystem,
} from "@/lib/tech-desk-monitor";
import {escapeHtml} from "@/lib/security";
import {createAdminClient} from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const day = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({error: "Unauthorized"}, {status: 401});
  }
  const admin = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const [{data: systems}, {data: settings}] = await Promise.all([
    admin
      .from("tech_desk_systems")
      .select(
        "id,slug,name,base_url,health_url,provider,vercel_project,github_repo,active",
      )
      .eq("active", true),
    admin
      .from("tech_desk_settings")
      .select("first_follow_up_days,auto_close_days,max_student_follow_ups")
      .eq("id", true)
      .maybeSingle(),
  ]);

  const healthResults = await Promise.allSettled(
    (systems ?? []).map((system) =>
      runTechSystemProbe(admin, system as TechDeskSystem),
    ),
  );
  const healthChecked = healthResults.filter(
    (result) => result.status === "fulfilled",
  ).length;
  const healthFailed = healthResults.length - healthChecked;

  const {data: dueTickets, error: queueError} = await admin
    .from("tech_desk_tickets")
    .select(
      "id,ticket_code,email,requester_name,preferred_name,subject,status,follow_up_count,updated_at",
    )
    .not("verified_at", "is", null)
    .lte("next_follow_up_at", nowIso)
    .in("status", [
      "waiting_on_student",
      "action_ready",
      "resolved_pending_confirmation",
    ])
    .order("next_follow_up_at")
    .limit(40);
  if (queueError) {
    return NextResponse.json(
      {error: "Tech Desk follow-up queue unavailable", healthChecked, healthFailed},
      {status: 500},
    );
  }

  const firstFollowUpDays = settings?.first_follow_up_days ?? 3;
  const autoCloseDays = settings?.auto_close_days ?? 7;
  const maxFollowUps = settings?.max_student_follow_ups ?? 2;
  let remindersSent = 0;
  let autoClosed = 0;
  let emailFailures = 0;

  for (const ticket of dueTickets ?? []) {
    const count = ticket.follow_up_count ?? 0;
    const displayName = ticket.preferred_name || ticket.requester_name;
    if (count >= maxFollowUps) {
      const closureMessage =
        ticket.status === "resolved_pending_confirmation"
          ? "The Tech Desk marked the issue resolved after sending confirmation reminders and receiving no additional problem report."
          : "The Tech Desk closed this inactive ticket after its follow-up reminders. The record is preserved, and a new ticket may be opened if the issue continues.";
      try {
        await deliverTechDeskEmail({
          ticketId: ticket.id,
          eventKey: "automatic_ticket_close",
          to: ticket.email,
          subject: `[EFF Tech Desk ${ticket.ticket_code}] Ticket Closed After Follow-Up`,
          html: `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#25143d;max-width:680px;margin:auto"><div style="background:#2b0a63;color:#fff;padding:24px"><strong>ESTHER FUNDS FOUNDATION</strong><h1 style="margin:8px 0 0">Tech Desk ticket update</h1></div><div style="padding:26px;border:1px solid #ded1ef"><p>Hello ${escapeHtml(displayName)},</p><p>${escapeHtml(closureMessage)}</p><p><strong>${ticket.ticket_code}</strong> · ${escapeHtml(ticket.subject)}</p><p>If the issue remains, open one new ticket at <a href="https://portal.estherfundsfoundation.org/tech-desk/open-ticket">portal.estherfundsfoundation.org/tech-desk/open-ticket</a> and reference this ticket number.</p><p>Never send passwords or verification codes.</p></div></div>`,
          text: `Hello ${displayName},\n\n${closureMessage}\n\nTicket: ${ticket.ticket_code}\n\nIf the issue remains, open one new ticket at https://portal.estherfundsfoundation.org/tech-desk/open-ticket and reference this number.`,
        });
      } catch {
        emailFailures++;
        continue;
      }
      await Promise.all([
        admin.from("tech_desk_tickets").update({
          status: "auto_closed",
          resolved_at:
            ticket.status === "resolved_pending_confirmation" ? nowIso : null,
          closed_at: nowIso,
          closure_reason: closureMessage,
          next_follow_up_at: null,
          updated_at: nowIso,
        }).eq("id", ticket.id),
        admin.from("tech_desk_messages").insert({
          ticket_id: ticket.id,
          author_type: "system",
          author_name: "EFF Tech Desk",
          body: closureMessage,
        }),
        admin.from("tech_desk_events").insert({
          ticket_id: ticket.id,
          event_type: "ticket_auto_closed_after_followup",
          summary_safe:
            "The Tech Desk auto-closed the inactive ticket after the configured reminders.",
          metadata_safe: {followUpCount: count},
        }),
      ]);
      autoClosed++;
      continue;
    }

    const nextCount = count + 1;
    const isFinal = nextCount >= maxFollowUps;
    const reminderText =
      ticket.status === "resolved_pending_confirmation"
        ? "EFF marked the technical issue resolved and is waiting for your confirmation. Close the ticket if it is fixed, or send a secure update if the problem continues."
        : "The EFF Tech Desk is waiting for the information requested in your secure ticket. Send an update if you still need help, or close the ticket if the issue is fixed.";
    try {
      await deliverTechDeskEmail({
        ticketId: ticket.id,
        eventKey: isFinal ? "final_ticket_followup" : "ticket_followup",
        to: ticket.email,
        subject: `[EFF Tech Desk ${ticket.ticket_code}] ${
          isFinal ? "Final Follow-Up" : "Follow-Up"
        }`,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#25143d;max-width:680px;margin:auto"><h1 style="color:#42127f">EFF Tech Desk follow-up</h1><p>Hello ${escapeHtml(displayName)},</p><p>${escapeHtml(reminderText)}</p><p><strong>${ticket.ticket_code}</strong> · ${escapeHtml(ticket.subject)}</p><p><a href="https://portal.estherfundsfoundation.org/tech-desk/access" style="display:inline-block;background:#42127f;color:#fff;padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:700">Request Secure Ticket Access</a></p><p>${isFinal ? "This is the final automatic reminder. The ticket will close if no update is received." : "The ticket history stays together when you reply inside the secure workspace."}</p><p>Never send passwords, verification codes, private API keys, Social Security numbers, or full bank details.</p></div>`,
        text: `Hello ${displayName},\n\n${reminderText}\n\nTicket: ${ticket.ticket_code}\n\nRequest secure access: https://portal.estherfundsfoundation.org/tech-desk/access\n\n${isFinal ? "This is the final automatic reminder. The ticket will close if no update is received." : ""}`,
      });
    } catch {
      emailFailures++;
      continue;
    }
    const nextDelayDays = isFinal
      ? 1
      : Math.max(1, autoCloseDays - firstFollowUpDays);
    await Promise.all([
      admin.from("tech_desk_tickets").update({
        follow_up_count: nextCount,
        next_follow_up_at: new Date(now.getTime() + nextDelayDays * day).toISOString(),
        updated_at: nowIso,
      }).eq("id", ticket.id),
      admin.from("tech_desk_events").insert({
        ticket_id: ticket.id,
        event_type: isFinal
          ? "final_automatic_followup_sent"
          : "automatic_followup_sent",
        summary_safe: `Automatic Tech Desk follow-up ${nextCount} was sent.`,
      }),
    ]);
    remindersSent++;
  }

  return NextResponse.json({
    healthChecked,
    healthFailed,
    dueTickets: dueTickets?.length ?? 0,
    remindersSent,
    autoClosed,
    emailFailures,
  });
}
