import "server-only";

import {createHash, randomBytes} from "node:crypto";
import {headers} from "next/headers";
import {normalizeTechTicketNumber} from "@/lib/tech-desk";
import {createAdminClient} from "@/lib/supabase/admin";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export async function techDeskPublicOrigin() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ||
    requestHeaders.get("host") ||
    "portal.estherfundsfoundation.org";
  return host.includes("localhost")
    ? `http://${host}`
    : "https://portal.estherfundsfoundation.org";
}

export async function createTechAccessLink(record: {
  id: string;
  ticket_code: string;
  email: string;
}) {
  const admin = createAdminClient();
  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const {error} = await admin.from("tech_desk_access_tokens").insert({
    ticket_id: record.id,
    token_hash: hash(rawToken),
    requested_email: record.email,
    expires_at: expiresAt,
  });
  if (error) throw error;
  return {
    rawToken,
    expiresAt,
    url: `${await techDeskPublicOrigin()}/tech-desk/tickets/${encodeURIComponent(
      record.ticket_code,
    )}?access=${encodeURIComponent(rawToken)}`,
  };
}

export async function validateTechTicketAccess(
  rawTicketCode: unknown,
  access: unknown,
) {
  const admin = createAdminClient();
  const ticketCode = normalizeTechTicketNumber(rawTicketCode);
  const tokenValue = String(access ?? "");
  if (!ticketCode || tokenValue.length < 30) {
    return {admin, ticket: null, ticketCode};
  }
  const {data: ticket} = await admin
    .from("tech_desk_tickets")
    .select("*")
    .eq("ticket_code", ticketCode)
    .maybeSingle();
  if (!ticket) return {admin, ticket: null, ticketCode};
  const {data: token} = await admin
    .from("tech_desk_access_tokens")
    .select("id")
    .eq("ticket_id", ticket.id)
    .eq("token_hash", hash(tokenValue))
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!token) return {admin, ticket: null, ticketCode};
  await admin
    .from("tech_desk_access_tokens")
    .update({last_used_at: new Date().toISOString()})
    .eq("id", token.id);
  return {admin, ticket, ticketCode};
}
