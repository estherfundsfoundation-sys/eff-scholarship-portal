"use server";

import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";
import {emailFrom, getResend} from "@/lib/email";
import {
  isActiveStaffRole,
  normalizeStaffEmail,
  safeStaffDestination,
  staffAccessHash,
  staffRoles,
} from "@/lib/staff-access";

type GeneratedLinkProperties = {
  email_otp?: string;
};

function auditSecret() {
  return process.env.STAFF_LOGIN_AUDIT_SECRET ?? "";
}

async function requestFingerprint(email: string) {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for");
  const ipAddress =
    forwarded?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "unknown";
  const secret = auditSecret();
  return {
    emailHash: staffAccessHash(email, secret),
    ipHash: staffAccessHash(ipAddress, secret),
  };
}

async function writeAccessAudit(
  action: string,
  targetId: string,
  metadata: Record<string, string | number | boolean> = {},
  actorId: string | null = null,
) {
  const admin = createAdminClient();
  await admin.from("audit_events").insert({
    actor_id: actorId,
    action,
    target_type: "staff_login",
    target_id: targetId,
    metadata_safe: metadata,
  });
}

export async function requestStaffLoginCode(formData: FormData) {
  const email = normalizeStaffEmail(formData.get("email"));
  const next = safeStaffDestination(formData.get("next"));
  const genericDestination = `/admin/sign-in?sent=1&next=${encodeURIComponent(next)}`;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    redirect(
      `/admin/sign-in?error=${encodeURIComponent("Enter a valid email address.")}&next=${encodeURIComponent(next)}`,
    );
  }

  let fingerprint: {emailHash: string; ipHash: string};
  try {
    fingerprint = await requestFingerprint(email);
  } catch {
    redirect(
      `/admin/sign-in?error=${encodeURIComponent("Staff code delivery is not configured. Contact the National Office.")}&next=${encodeURIComponent(next)}`,
    );
  }

  const admin = createAdminClient();
  const rateResult = await admin.rpc("request_staff_login_code", {
    p_email_hash: fingerprint.emailHash,
    p_ip_hash: fingerprint.ipHash,
  });
  const rate = Array.isArray(rateResult.data)
    ? rateResult.data[0]
    : rateResult.data;
  if (rateResult.error) {
    await writeAccessAudit(
      "staff_login_code_request_failed",
      fingerprint.emailHash,
      {reason: "rate_limit_check_unavailable"},
    );
    redirect(
      `/admin/sign-in?error=${encodeURIComponent("We could not process that request safely. Please try again shortly.")}&next=${encodeURIComponent(next)}`,
    );
  }
  if (!rate?.allowed) {
    redirect(
      `/admin/sign-in?limited=1&next=${encodeURIComponent(next)}`,
    );
  }

  const profileResult = await admin
    .from("profiles")
    .select("id")
    .eq("primary_email", email)
    .maybeSingle();
  const profileId = profileResult.data?.id;
  const roleResult = profileId
    ? await admin
        .from("user_roles")
        .select("role,active")
        .eq("user_id", profileId)
        .eq("active", true)
        .in("role", [...staffRoles])
    : {data: null, error: null};
  const authorized = Boolean(
    roleResult.data?.some((role) =>
      isActiveStaffRole(role.role, role.active),
    ),
  );

  // Always return the same screen so the form cannot be used to enumerate
  // staff accounts.
  if (!authorized) {
    await writeAccessAudit(
      "staff_login_code_request_denied",
      fingerprint.emailHash,
      {reason: "no_active_staff_role"},
    );
    redirect(genericDestination);
  }

  const generated = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const properties = generated.data?.properties as
    | GeneratedLinkProperties
    | undefined;
  const code = properties?.email_otp;
  if (generated.error || !code) {
    await writeAccessAudit(
      "staff_login_code_request_failed",
      fingerprint.emailHash,
      {reason: "supabase_code_generation_failed"},
      profileId ?? null,
    );
    redirect(genericDestination);
  }

  const delivery = await getResend().emails.send({
    from: emailFrom,
    to: email,
    replyTo: "nationals@estherfundsinc.org",
    subject: "Your Esther Funds Foundation staff verification code",
    html: `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#25143d;max-width:620px;margin:auto"><div style="background:#42127f;color:#fff;padding:24px"><strong>ESTHER FUNDS FOUNDATION</strong><h1 style="margin:8px 0 0">Staff verification code</h1></div><div style="padding:28px;border:1px solid #ded1ef"><p>Enter this one-time code on the Scholarship Administration sign-in page:</p><p style="font-size:32px;font-weight:800;letter-spacing:8px;color:#42127f">${code}</p><p>The code expires shortly and can be used only once. If you did not request it, do not share it and contact the National Office.</p><p>EFF will never ask you to email or text this code.</p></div></div>`,
    text: `Your Esther Funds Foundation Scholarship Administration verification code is ${code}.\n\nIt expires shortly and can be used only once. EFF will never ask you to email or text this code.`,
  });

  if (delivery.error) {
    await writeAccessAudit(
      "staff_login_code_delivery_failed",
      fingerprint.emailHash,
      {provider: "resend"},
      profileId ?? null,
    );
    redirect(genericDestination);
  }

  await writeAccessAudit(
    "staff_login_code_delivered",
    fingerprint.emailHash,
    {provider: "resend"},
    profileId ?? null,
  );
  redirect(genericDestination);
}

export async function verifyStaffLoginCode(formData: FormData) {
  const email = normalizeStaffEmail(formData.get("email"));
  const code = String(formData.get("code") ?? "")
    .replace(/\s/g, "")
    .trim();
  const next = safeStaffDestination(formData.get("next"));
  const supabase = await createClient();
  let emailHash = "unavailable";
  try {
    emailHash = (await requestFingerprint(email)).emailHash;
  } catch {
    redirect(
      `/admin/sign-in?error=${encodeURIComponent("Staff code verification is not configured. Contact the National Office.")}&next=${encodeURIComponent(next)}`,
    );
  }

  if (!/^\d{6,8}$/.test(code)) {
    await writeAccessAudit("staff_login_code_verification_failed", emailHash, {
      reason: "invalid_code_format",
    });
    redirect(
      `/admin/sign-in?error=${encodeURIComponent("Enter the complete verification code from the newest email.")}&next=${encodeURIComponent(next)}`,
    );
  }

  const verified = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });
  const user = verified.data.user;
  if (verified.error || !user) {
    await writeAccessAudit("staff_login_code_verification_failed", emailHash, {
      reason: "invalid_or_expired_code",
    });
    redirect(
      `/admin/sign-in?error=${encodeURIComponent("That code is invalid or expired. Request a new code and use only the newest email.")}&next=${encodeURIComponent(next)}`,
    );
  }

  const admin = createAdminClient();
  const roles = await admin
    .from("user_roles")
    .select("role,active")
    .eq("user_id", user.id)
    .eq("active", true)
    .in("role", [...staffRoles]);
  const authorized = roles.data?.some((role) =>
    isActiveStaffRole(role.role, role.active),
  );
  if (!authorized) {
    await supabase.auth.signOut();
    await writeAccessAudit(
      "staff_login_code_verification_denied",
      emailHash,
      {reason: "no_active_staff_role"},
      user.id,
    );
    redirect(
      `/admin/sign-in?denied=1&next=${encodeURIComponent(next)}`,
    );
  }

  await writeAccessAudit(
    "staff_login_code_verified",
    emailHash,
    {destination: next},
    user.id,
  );
  redirect(next);
}
