"use server";

import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {emailFrom, getResend} from "@/lib/email";
import {createReachClaimToken, hashReachClaimToken} from "@/lib/reach/claim-token";
import {escapeHtml} from "@/lib/security";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";

const normalizeEmail = (value: FormDataEntryValue | null) =>
  String(value ?? "").trim().toLowerCase().slice(0, 320);

export async function requestReachClaimLink(formData: FormData) {
  const invitationEmail = normalizeEmail(formData.get("invitationEmail"));
  const genericDestination = "/reach/claim?sent=1";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitationEmail)) {
    redirect("/reach/claim?error=Enter+a+valid+invitation+email+address.");
  }

  const admin = createAdminClient();
  const {data: ambassador} = await admin
    .from("reach_ambassadors")
    .select("id,email,full_name,user_id,active,claim_link_sent_at")
    .eq("email", invitationEmail)
    .maybeSingle();

  // Keep the public response identical when an address is not on the roster.
  if (!ambassador?.active) redirect(genericDestination);

  const lastSent = ambassador.claim_link_sent_at
    ? new Date(ambassador.claim_link_sent_at).getTime()
    : 0;
  if (Date.now() - lastSent < 2 * 60 * 1000) redirect(genericDestination);

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? "https://portal.estherfundsfoundation.org";
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const {token, tokenHash} = createReachClaimToken();
  const claimUrl = new URL("/reach/claim", origin);
  claimUrl.searchParams.set("token", token);

  const {error: tokenError} = await admin
    .from("reach_ambassadors")
    .update({
      claim_token_hash: tokenHash,
      claim_token_expires_at: expiresAt,
      claim_link_sent_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", ambassador.id);
  if (tokenError) {
    console.error("REACH claim token could not be stored", tokenError);
    redirect("/reach/claim?error=We+could+not+prepare+your+secure+claim+link.+Please+try+again.");
  }

  const firstName = escapeHtml(ambassador.full_name?.trim().split(/\s+/)[0] || "Ambassador");
  const {error: deliveryError} = await getResend().emails.send({
    from: emailFrom,
    to: ambassador.email,
    replyTo: "nationals@estherfundsinc.org",
    subject: "Your secure EFF REACH Ambassador account link",
    html: `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#2b1740;max-width:680px;margin:auto">
      <div style="background:#42127F;color:#fff;padding:28px"><div style="font-size:13px;letter-spacing:.12em;color:#D8C3F1;font-weight:700">ESTHER FUNDS FOUNDATION · REACH</div><h1 style="margin:8px 0 0">Connect your ambassador account</h1></div>
      <div style="padding:28px;border:1px solid #ded2e8">
        <p>Hello ${firstName},</p>
        <p>Use this private link to connect your approved REACH Ambassador record. After opening it, you may sign in with an existing EFF Portal account or create an account with <strong>any email address you control</strong>.</p>
        <p><a href="${claimUrl.toString()}" style="display:inline-block;background:#42127F;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">Connect my REACH account</a></p>
        <p>This one-time link expires in 24 hours. Do not forward it or share a password or verification code.</p>
        <p>If you did not request this link, you may ignore this message.</p>
        <p><strong>The REACH Team</strong><br/>Esther Funds Foundation</p>
      </div>
    </div>`,
    text: `Hello ${ambassador.full_name?.trim().split(/\s+/)[0] || "Ambassador"},

Use this private link to connect your approved EFF REACH Ambassador record:
${claimUrl.toString()}

You may sign in with an existing EFF Portal account or create an account with any email address you control. This one-time link expires in 24 hours. Do not forward it or share a password or verification code.

The REACH Team
Esther Funds Foundation`,
  });

  if (deliveryError) {
    await admin
      .from("reach_ambassadors")
      .update({
        claim_token_hash: null,
        claim_token_expires_at: null,
        claim_link_sent_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ambassador.id)
      .eq("claim_token_hash", tokenHash);
    console.error("REACH claim email could not be sent", deliveryError);
    redirect("/reach/claim?error=We+could+not+send+your+secure+claim+link.+Please+try+again+or+contact+EFF.");
  }

  redirect(genericDestination);
}

export async function connectReachAmbassadorAccount(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const tokenHash = hashReachClaimToken(token);
  if (!tokenHash) redirect("/reach/claim?error=That+secure+claim+link+is+invalid+or+expired.");

  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user?.email) {
    redirect(`/sign-in?next=${encodeURIComponent(`/reach/claim?token=${token}`)}`);
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const {data: existingAccount} = await admin
    .from("reach_ambassadors")
    .select("id,active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingAccount?.active) redirect("/reach/ambassador");

  const {data: invitation} = await admin
    .from("reach_ambassadors")
    .select("id,user_id,active")
    .eq("claim_token_hash", tokenHash)
    .gt("claim_token_expires_at", now)
    .maybeSingle();
  if (!invitation?.active || (invitation.user_id && invitation.user_id !== user.id)) {
    redirect("/reach/claim?error=That+secure+claim+link+is+invalid,+expired,+or+already+used.");
  }

  const loginEmail = user.email.trim().toLowerCase();
  const {data: claimed, error} = await admin
    .from("reach_ambassadors")
    .update({
      user_id: user.id,
      login_email: loginEmail,
      claimed_at: now,
      claim_token_hash: null,
      claim_token_expires_at: null,
      updated_at: now,
    })
    .eq("id", invitation.id)
    .select("id")
    .single();
  if (error || !claimed) {
    console.error("REACH ambassador account could not be connected", error);
    redirect("/reach/claim?error=We+could+not+connect+this+account.+Please+contact+EFF+for+help.");
  }

  await admin.from("audit_events").insert({
    actor_id: user.id,
    action: "reach_ambassador_account_connected_by_secure_link",
    target_type: "reach_ambassador",
    target_id: invitation.id,
    metadata_safe: {login_email_domain: loginEmail.split("@")[1] ?? "unknown"},
  });
  redirect("/reach/ambassador");
}
