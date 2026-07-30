"use server";

import {createHash, randomBytes} from "node:crypto";
import {revalidatePath} from "next/cache";
import {z} from "zod";
import {
  createTechAccessLink,
  techDeskPublicOrigin,
} from "@/lib/tech-desk-access";
import {deliverTechDeskEmail} from "@/lib/tech-desk-email";
import {requireTechDeskStaff} from "@/lib/tech-desk-server";
import {escapeHtml} from "@/lib/security";
import {createAdminClient} from "@/lib/supabase/admin";

const value = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();
const hash = (input: string) =>
  createHash("sha256").update(input).digest("hex");

export async function resendTechTicketInvitation(formData: FormData) {
  const {user} = await requireTechDeskStaff();
  const ticketId = value(formData, "ticketId");
  if (!z.string().uuid().safeParse(ticketId).success) return;
  const admin = createAdminClient();
  const {data: ticket} = await admin
    .from("tech_desk_tickets")
    .select("id,ticket_code,email,requester_name,preferred_name,verified_at")
    .eq("id", ticketId)
    .maybeSingle();
  if (!ticket) return;

  let subject: string;
  let html: string;
  let text: string;
  let eventKey: string;
  if (ticket.verified_at) {
    const link = await createTechAccessLink(ticket);
    subject = `[EFF Tech Desk ${ticket.ticket_code}] Secure Ticket Access`;
    html = `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#25143d"><h1 style="color:#42127f">Your secure Tech Desk ticket</h1><p>Hello ${escapeHtml(ticket.preferred_name || ticket.requester_name)},</p><p><a href="${link.url}" style="display:inline-block;background:#42127f;color:#fff;padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:700">Open My Secure Ticket</a></p><p>This link expires in 30 minutes. Never forward it.</p></div>`;
    text = `Open EFF Tech Desk ticket ${ticket.ticket_code}: ${link.url}\n\nThis link expires in 30 minutes.`;
    eventKey = "staff_resent_secure_access";
  } else {
    const rawToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await admin
      .from("tech_desk_tickets")
      .update({
        verification_token_hash: hash(rawToken),
        verification_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticket.id);
    const url = `${await techDeskPublicOrigin()}/tech-desk/verify?token=${encodeURIComponent(rawToken)}`;
    subject = `Verify Your EFF Tech Desk Ticket ${ticket.ticket_code}`;
    html = `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#25143d"><h1 style="color:#42127f">Verify your Tech Desk ticket</h1><p>Hello ${escapeHtml(ticket.preferred_name || ticket.requester_name)},</p><p><a href="${url}" style="display:inline-block;background:#42127f;color:#fff;padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:700">Verify and Start Diagnosis</a></p><p>This link expires in 24 hours.</p></div>`;
    text = `Verify EFF Tech Desk ticket ${ticket.ticket_code}: ${url}`;
    eventKey = "staff_resent_verification";
  }
  await deliverTechDeskEmail({
    ticketId: ticket.id,
    eventKey,
    to: ticket.email,
    subject,
    html,
    text,
  });
  await admin.from("tech_desk_events").insert({
    ticket_id: ticket.id,
    actor_user_id: user.id,
    event_type: eventKey,
    summary_safe: ticket.verified_at
      ? "Authorized staff resent a secure ticket-access link."
      : "Authorized staff issued a fresh ticket-verification link.",
  });
  revalidatePath("/tech-desk/admin");
}

export async function grantTechDeskRole(formData: FormData) {
  const {user, roles} = await requireTechDeskStaff();
  if (!roles.includes("tech_desk_admin")) return;
  const email = value(formData, "email").toLowerCase();
  const role = value(formData, "role");
  if (
    !z.string().email().safeParse(email).success ||
    !["tech_desk_agent", "tech_desk_lead", "tech_desk_admin"].includes(role)
  ) {
    return;
  }
  const admin = createAdminClient();
  const {data} = await admin.auth.admin.listUsers({page: 1, perPage: 1000});
  const target = data.users.find(
    (candidate) => candidate.email?.toLowerCase() === email,
  );
  if (!target) return;
  await admin.from("tech_desk_staff_roles").upsert(
    {
      user_id: target.id,
      role,
      active: true,
      granted_by: user.id,
      granted_at: new Date().toISOString(),
      revoked_at: null,
    },
    {onConflict: "user_id,role"},
  );
  await admin.from("tech_desk_events").insert({
    actor_user_id: user.id,
    event_type: "tech_desk_role_granted",
    summary_safe: `An authorized administrator granted ${role.replaceAll("_", " ")} access.`,
    metadata_safe: {targetUserId: target.id},
  });
  revalidatePath("/tech-desk/admin");
}

export async function revokeTechDeskRole(formData: FormData) {
  const {user, roles} = await requireTechDeskStaff();
  if (!roles.includes("tech_desk_admin")) return;
  const targetUserId = value(formData, "userId");
  const role = value(formData, "role");
  if (
    !z.string().uuid().safeParse(targetUserId).success ||
    !["tech_desk_agent", "tech_desk_lead", "tech_desk_admin"].includes(role)
  ) {
    return;
  }
  const admin = createAdminClient();
  const {data: target} = await admin.auth.admin.getUserById(targetUserId);
  if (target.user?.email?.toLowerCase() === "nationals@estherfundsinc.org") return;
  await admin
    .from("tech_desk_staff_roles")
    .update({
      active: false,
      revoked_at: new Date().toISOString(),
    })
    .eq("user_id", targetUserId)
    .eq("role", role);
  await admin.from("tech_desk_events").insert({
    actor_user_id: user.id,
    event_type: "tech_desk_role_revoked",
    summary_safe: `An authorized administrator revoked ${role.replaceAll("_", " ")} access.`,
    metadata_safe: {targetUserId},
  });
  revalidatePath("/tech-desk/admin");
}
