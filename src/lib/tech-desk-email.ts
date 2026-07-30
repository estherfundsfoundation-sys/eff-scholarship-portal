import "server-only";

import {createHash} from "node:crypto";
import {emailFrom, getResend} from "@/lib/email";
import {createAdminClient} from "@/lib/supabase/admin";

export async function deliverTechDeskEmail(input: {
  ticketId: string;
  eventKey: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const admin = createAdminClient();
  const recipientHash = createHash("sha256")
    .update(input.to.trim().toLowerCase())
    .digest("hex");
  try {
    const result = await getResend().emails.send({
      from: emailFrom,
      to: input.to,
      replyTo: "nationals@estherfundsinc.org",
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (result.error) throw new Error(result.error.message);
    await admin.from("tech_desk_email_events").insert({
      ticket_id: input.ticketId,
      event_key: input.eventKey,
      recipient_hash: recipientHash,
      status: "sent",
      provider_id: result.data?.id ?? null,
    });
    return result.data?.id ?? null;
  } catch (error) {
    await admin.from("tech_desk_email_events").insert({
      ticket_id: input.ticketId,
      event_key: input.eventKey,
      recipient_hash: recipientHash,
      status: "failed",
      error_safe: "Email provider did not accept this delivery.",
    });
    throw error;
  }
}
