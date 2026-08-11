"use server";

import {createHash, randomBytes, randomUUID} from "node:crypto";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {z} from "zod";
import {emailFrom, getResend} from "@/lib/email";
import {escapeHtml} from "@/lib/security";
import {
  classifyTechIssue,
  normalizeOfficialEffUrl,
  normalizeTechTicketNumber,
  redactSensitiveText,
  safeTechDeskDestination,
  techDeskIssueCategories,
  techDeskProducts,
} from "@/lib/tech-desk";
import {diagnoseTechTicket, runTechSystemProbe} from "@/lib/tech-desk-monitor";
import {
  createTechAccessLink,
  techDeskPublicOrigin,
  validateTechTicketAccess,
} from "@/lib/tech-desk-access";
import {
  getTechDeskStaffContext,
  getTechDeskUser,
  requireTechDeskStaff,
} from "@/lib/tech-desk-server";
import {createAdminClient} from "@/lib/supabase/admin";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const emailHash = (value: string) => hash(value.trim().toLowerCase());
const allowedProducts = new Set<string>(
  techDeskProducts.map((product) => product.slug),
);
const allowedCategories = new Set<string>(
  techDeskIssueCategories.map(([value]) => value),
);
const allowedAttachmentTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "text/plain",
]);

async function logEmail(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    ticketId: string;
    eventKey: string;
    recipient: string;
    status: "sent" | "failed" | "skipped";
    providerId?: string | null;
    errorSafe?: string | null;
  },
) {
  await admin.from("tech_desk_email_events").insert({
    ticket_id: input.ticketId,
    event_key: input.eventKey,
    recipient_hash: emailHash(input.recipient),
    status: input.status,
    provider_id: input.providerId ?? null,
    error_safe: input.errorSafe ?? null,
  });
}

async function sendTechEmail(input: {
  ticketId: string;
  eventKey: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const admin = createAdminClient();
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
    await logEmail(admin, {
      ticketId: input.ticketId,
      eventKey: input.eventKey,
      recipient: input.to,
      status: "sent",
      providerId: result.data?.id,
    });
    return result.data?.id ?? null;
  } catch (error) {
    await logEmail(admin, {
      ticketId: input.ticketId,
      eventKey: input.eventKey,
      recipient: input.to,
      status: "failed",
      errorSafe: "Email provider did not accept this delivery.",
    });
    throw error;
  }
}

const ticketSchema = z.object({
  requesterName: z.string().trim().min(2).max(120),
  preferredName: z.string().trim().max(80),
  email: z.string().trim().email().max(180),
  productSlug: z.string().refine((value) => allowedProducts.has(value)),
  pageUrl: z.string().max(500),
  issueCategory: z.string().refine((value) => allowedCategories.has(value)),
  urgency: z.enum([
    "deadline_within_72_hours",
    "fully_blocked",
    "partially_blocked",
    "question",
  ]),
  deadlineAt: z.string().max(40),
  subject: z.string().trim().min(5).max(180),
  description: z.string().trim().min(40).max(6000),
  stepsToReproduce: z.string().trim().min(10).max(4000),
  errorMessage: z.string().trim().max(3000),
  browserDevice: z.string().trim().max(240),
  lastWorkingAt: z.string().max(40),
  authorizeDiagnostics: z.literal("on"),
  privacyConsent: z.literal("on"),
  accuracyCertified: z.literal("on"),
});

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function safeDate(valueToParse: string) {
  if (!valueToParse) return null;
  const date = new Date(valueToParse);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

function safeFilename(valueToClean: string) {
  const cleaned = valueToClean.replace(/[^A-Za-z0-9._-]+/g, "-").slice(-120);
  return cleaned || "attachment";
}

export async function submitTechTicket(formData: FormData) {
  if (value(formData, "companyWebsite")) {
    redirect("/tech-desk/open-ticket?submitted=1");
  }
  const parsed = ticketSchema.safeParse({
    requesterName: value(formData, "requesterName"),
    preferredName: value(formData, "preferredName"),
    email: value(formData, "email").toLowerCase(),
    productSlug: value(formData, "productSlug"),
    pageUrl: value(formData, "pageUrl"),
    issueCategory: value(formData, "issueCategory"),
    urgency: value(formData, "urgency"),
    deadlineAt: value(formData, "deadlineAt"),
    subject: value(formData, "subject"),
    description: value(formData, "description"),
    stepsToReproduce: value(formData, "stepsToReproduce"),
    errorMessage: value(formData, "errorMessage"),
    browserDevice: value(formData, "browserDevice"),
    lastWorkingAt: value(formData, "lastWorkingAt"),
    authorizeDiagnostics: value(formData, "authorizeDiagnostics"),
    privacyConsent: value(formData, "privacyConsent"),
    accuracyCertified: value(formData, "accuracyCertified"),
  });
  if (!parsed.success) {
    redirect(
      `/tech-desk/open-ticket?error=${encodeURIComponent(
        "Complete every required field. Do not include passwords, verification codes, or private financial information.",
      )}`,
    );
  }

  const description = redactSensitiveText(parsed.data.description);
  const stepsToReproduce = redactSensitiveText(parsed.data.stepsToReproduce, 4000);
  const errorMessage = redactSensitiveText(parsed.data.errorMessage, 3000);
  const diagnosis = classifyTechIssue({
    category: parsed.data.issueCategory,
    description,
    errorMessage,
    urgency: parsed.data.urgency,
  });
  const pageUrl = normalizeOfficialEffUrl(parsed.data.pageUrl);
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ipHash = hash(`${process.env.CRON_SECRET || "eff-tech-desk"}:${ip}`);
  const id = randomUUID();
  const ticketCode = `EFF-TECH-${new Date().getUTCFullYear()}-${id
    .slice(0, 8)
    .toUpperCase()}`;
  const rawVerification = randomBytes(32).toString("base64url");
  const admin = createAdminClient();
  const record = {
    id,
    ticket_code: ticketCode,
    requester_name: parsed.data.requesterName,
    preferred_name: parsed.data.preferredName || null,
    email: parsed.data.email,
    product_slug: parsed.data.productSlug,
    page_url: pageUrl,
    issue_category: parsed.data.issueCategory,
    urgency: parsed.data.urgency,
    deadline_at: safeDate(parsed.data.deadlineAt),
    subject: redactSensitiveText(parsed.data.subject, 180),
    description,
    steps_to_reproduce: stepsToReproduce,
    error_message: errorMessage || null,
    browser_device: redactSensitiveText(parsed.data.browserDevice, 240) || null,
    last_working_at: safeDate(parsed.data.lastWorkingAt),
    priority: diagnosis.priority,
    verification_token_hash: hash(rawVerification),
    verification_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    authorize_diagnostics: true,
    privacy_consent: true,
    accuracy_certified: true,
    ip_hash: ipHash,
  };
  const saved = await admin.from("tech_desk_tickets").insert(record);
  if (saved.error) {
    console.error("Tech Desk ticket save failed", saved.error);
    redirect(
      `/tech-desk/open-ticket?error=${encodeURIComponent(
        "The Tech Desk could not save this ticket. Please try again.",
      )}`,
    );
  }

  await admin.from("tech_desk_events").insert({
    ticket_id: id,
    event_type: "ticket_submitted",
    summary_safe: "A new technical-support ticket was submitted and awaits email verification.",
    metadata_safe: {
      product: parsed.data.productSlug,
      category: parsed.data.issueCategory,
      priority: diagnosis.priority,
      sensitiveTextRedactionApplied:
        description !== parsed.data.description ||
        errorMessage !== parsed.data.errorMessage ||
        stepsToReproduce !== parsed.data.stepsToReproduce,
    },
  });

  const attachment = formData.get("screenshot");
  if (attachment instanceof File && attachment.size > 0) {
    if (attachment.size <= 5 * 1024 * 1024 && allowedAttachmentTypes.has(attachment.type)) {
      const path = `${id}/${randomUUID()}-${safeFilename(attachment.name)}`;
      const upload = await admin.storage
        .from("tech-desk-attachments")
        .upload(path, await attachment.arrayBuffer(), {
          contentType: attachment.type,
          upsert: false,
        });
      if (!upload.error) {
        await admin.from("tech_desk_attachments").insert({
          ticket_id: id,
          storage_path: path,
          filename: safeFilename(attachment.name),
          content_type: attachment.type,
          size_bytes: attachment.size,
          uploaded_by_type: "student",
        });
      } else {
        await admin.from("tech_desk_events").insert({
          ticket_id: id,
          event_type: "attachment_upload_failed",
          summary_safe: "The optional attachment could not be stored; the ticket remains active.",
        });
      }
    } else {
      await admin.from("tech_desk_events").insert({
        ticket_id: id,
        event_type: "attachment_rejected",
        summary_safe: "An optional attachment was rejected because its size or type was not allowed.",
      });
    }
  }

  const verificationUrl = `${await techDeskPublicOrigin()}/tech-desk/verify?token=${encodeURIComponent(
    rawVerification,
  )}`;
  const displayName = escapeHtml(parsed.data.preferredName || parsed.data.requesterName);
  try {
    await sendTechEmail({
      ticketId: id,
      eventKey: "ticket_verification",
      to: parsed.data.email,
      subject: `Verify Your EFF Tech Desk Ticket ${ticketCode}`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#25143d;max-width:660px;margin:auto"><div style="background:#2b0a63;color:#fff;padding:26px"><strong>ESTHER FUNDS FOUNDATION</strong><h1 style="margin:8px 0 0">Verify your Tech Desk ticket</h1></div><div style="padding:28px;border:1px solid #ded1ef"><p>Hello ${displayName},</p><p>We received your technical-support ticket for an EFF platform.</p><p style="background:#f5f0e6;border-left:5px solid #42127f;padding:14px"><strong>Ticket: ${ticketCode}</strong></p><p>Verify your email within 24 hours. After verification, the Tech Desk will run safe diagnostics, check the public health of the selected EFF platform, and create your secure ticket workspace.</p><p><a href="${verificationUrl}" style="display:inline-block;background:#42127f;color:#fff;padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:700">Verify and Start Diagnosis</a></p><p><strong>Privacy:</strong> EFF will never ask for your password, verification code, private API key, full bank details, Social Security number, or unredacted identity documents in a Tech Desk ticket.</p><p>Esther Funds Foundation<br><em>Every Future Fulfilled.</em></p></div></div>`,
      text: `Hello ${parsed.data.preferredName || parsed.data.requesterName},\n\nVerify EFF Tech Desk ticket ${ticketCode}: ${verificationUrl}\n\nAfter verification, the Tech Desk will run safe diagnostics and create your secure ticket workspace. Never send passwords or verification codes.`,
    });
    await admin.from("tech_desk_events").insert({
      ticket_id: id,
      event_type: "verification_email_sent",
      summary_safe: "The ticket verification email was accepted for delivery.",
    });
  } catch (error) {
    console.error("Tech Desk verification email failed", error);
    redirect(
      `/tech-desk/open-ticket?delivery=failed&code=${encodeURIComponent(ticketCode)}`,
    );
  }
  redirect(
    `/tech-desk/open-ticket?submitted=1&code=${encodeURIComponent(ticketCode)}`,
  );
}

export async function requestTechTicketAccess(formData: FormData) {
  const ticketCode = normalizeTechTicketNumber(formData.get("ticketNumber"));
  const email = value(formData, "email").toLowerCase();
  if (ticketCode && z.string().email().safeParse(email).success) {
    const admin = createAdminClient();
    const {data: record} = await admin
      .from("tech_desk_tickets")
      .select("id,ticket_code,email,requester_name,preferred_name,verified_at")
      .eq("ticket_code", ticketCode)
      .eq("email", email)
      .maybeSingle();
    if (record?.verified_at) {
      try {
        const link = await createTechAccessLink(record);
        await sendTechEmail({
          ticketId: record.id,
          eventKey: "secure_access",
          to: record.email,
          subject: `Secure Access to EFF Tech Desk Ticket ${record.ticket_code}`,
          html: `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#25143d"><h1 style="color:#42127f">Your secure Tech Desk link</h1><p>Hello ${escapeHtml(record.preferred_name || record.requester_name)},</p><p><a href="${link.url}" style="display:inline-block;background:#42127f;color:#fff;padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:700">Open My Tech Desk Ticket</a></p><p>This link expires in 30 minutes. Never forward it.</p></div>`,
          text: `Access EFF Tech Desk ticket ${record.ticket_code}: ${link.url}\n\nThis link expires in 30 minutes.`,
        });
        await admin.from("tech_desk_events").insert({
          ticket_id: record.id,
          event_type: "secure_access_link_sent",
          summary_safe: "A time-limited Tech Desk access link was issued.",
        });
      } catch (error) {
        console.error("Tech Desk access delivery failed", error);
      }
    }
  }
  redirect("/tech-desk/access?sent=1");
}

export async function sendStudentTechMessage(formData: FormData) {
  const ticketCode = normalizeTechTicketNumber(formData.get("ticketNumber"));
  const access = value(formData, "access");
  const body = redactSensitiveText(formData.get("body"));
  if (!ticketCode || access.length < 30 || body.length < 2 || body.length > 6000) {
    redirect("/tech-desk/access?error=We+could+not+validate+that+message.");
  }
  const {admin, ticket} = await validateTechTicketAccess(ticketCode, access);
  if (!ticket) {
    redirect(
      `/tech-desk/access?expired=1&ticketNumber=${encodeURIComponent(ticketCode)}`,
    );
  }
  if (["closed_by_student", "auto_closed", "closed_by_staff"].includes(ticket.status)) {
    redirect(`/tech-desk/open-ticket?closed=${encodeURIComponent(ticketCode)}`);
  }
  await admin.from("tech_desk_messages").insert({
    ticket_id: ticket.id,
    author_type: "student",
    author_name: ticket.preferred_name || ticket.requester_name,
    body,
  });
  await admin
    .from("tech_desk_tickets")
    .update({
      status: "staff_review",
      last_student_message_at: new Date().toISOString(),
      next_follow_up_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticket.id);
  await admin.from("tech_desk_events").insert({
    ticket_id: ticket.id,
    event_type: "student_message_received",
    summary_safe: "The requester added a secure ticket update.",
  });
  revalidatePath(`/tech-desk/tickets/${ticketCode}`);
  redirect(
    `/tech-desk/tickets/${ticketCode}?access=${encodeURIComponent(access)}&message=sent`,
  );
}

export async function closeTechTicketByStudent(formData: FormData) {
  const ticketCode = normalizeTechTicketNumber(formData.get("ticketNumber"));
  const access = value(formData, "access");
  const closureReason = redactSensitiveText(formData.get("closureReason"), 500);
  const rating = Number(formData.get("rating"));
  const {admin, ticket} = await validateTechTicketAccess(ticketCode, access);
  if (!ticket) redirect("/tech-desk/access?expired=1");
  const now = new Date().toISOString();
  await admin
    .from("tech_desk_tickets")
    .update({
      status: "closed_by_student",
      closure_reason: closureReason || "Requester confirmed the technical issue is resolved.",
      satisfaction_rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
      resolved_at: ticket.resolved_at || now,
      closed_at: now,
      next_follow_up_at: null,
      updated_at: now,
    })
    .eq("id", ticket.id);
  await admin.from("tech_desk_events").insert({
    ticket_id: ticket.id,
    event_type: "ticket_closed_by_requester",
    summary_safe: "The requester confirmed resolution and closed the ticket.",
  });
  redirect(
    `/tech-desk/tickets/${ticketCode}?access=${encodeURIComponent(access)}&closed=1`,
  );
}

export async function signInTechDeskStaff(formData: FormData) {
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  const next = safeTechDeskDestination(formData.get("next"));
  const {supabase} = await getTechDeskUser();
  const {data, error} = await supabase.auth.signInWithPassword({email, password});
  if (error || !data.user) {
    redirect(
      `/tech-desk/staff/sign-in?error=${encodeURIComponent(
        "That sign-in was not recognized. Check the email and password or use Tech Desk password help.",
      )}`,
    );
  }
  const context = await getTechDeskStaffContext();
  if (!context.roles.length) {
    await supabase.auth.signOut();
    redirect("/tech-desk/staff/sign-in?denied=1");
  }
  redirect(next);
}

export async function requestTechDeskStaffPasswordReset(formData: FormData) {
  const email = value(formData, "email").toLowerCase();
  try {
    const admin = createAdminClient();
    const {data, error} = await admin.auth.admin.generateLink({type: "recovery", email});
    if (error || !data.properties?.hashed_token) throw error;
    const url = new URL("/auth/secure-link", await techDeskPublicOrigin());
    url.searchParams.set("token_hash", data.properties.hashed_token);
    url.searchParams.set("type", "recovery");
    url.searchParams.set("next", "/tech-desk/reset-password");
    await getResend().emails.send({
      from: emailFrom,
      to: email,
      subject: "Reset Your EFF Tech Desk Staff Password",
      html: `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#25143d"><h1 style="color:#42127f">EFF Tech Desk password reset</h1><p><a href="${url}" style="display:inline-block;background:#42127f;color:#fff;padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:700">Reset My Secure Password</a></p><p>Use only the newest reset link.</p></div>`,
      text: `Reset your EFF Tech Desk staff password: ${url}`,
    });
  } catch (error) {
    console.error("Tech Desk staff reset delivery failed", error);
  }
  redirect("/tech-desk/password-reset?sent=1");
}

export async function updateTechDeskStaffPassword(formData: FormData) {
  const password = value(formData, "password");
  if (password.length < 10) {
    redirect("/tech-desk/reset-password?error=Password+must+be+at+least+10+characters.");
  }
  const {supabase} = await getTechDeskUser();
  const {error} = await supabase.auth.updateUser({password});
  if (error) {
    redirect(
      `/tech-desk/reset-password?error=${encodeURIComponent(error.message)}`,
    );
  }
  await supabase.auth.signOut();
  redirect("/tech-desk/staff/sign-in?message=Password+updated.+Sign+in+again.");
}

export async function signOutTechDesk() {
  const {supabase} = await getTechDeskUser();
  await supabase.auth.signOut();
  redirect("/tech-desk/staff/sign-in");
}

export async function addStaffTechMessage(formData: FormData) {
  const {user} = await requireTechDeskStaff();
  const ticketId = value(formData, "ticketId");
  const body = redactSensitiveText(formData.get("body"));
  const nextStatus = value(formData, "nextStatus");
  const allowedStatuses = new Set([
    "waiting_on_student",
    "action_ready",
    "staff_review",
    "monitoring",
    "resolved_pending_confirmation",
    "closed_by_staff",
  ]);
  if (
    !z.string().uuid().safeParse(ticketId).success ||
    body.length < 2 ||
    !allowedStatuses.has(nextStatus)
  ) {
    return;
  }
  const admin = createAdminClient();
  const {data: ticket} = await admin
    .from("tech_desk_tickets")
    .select("id,ticket_code,email,requester_name,preferred_name,status")
    .eq("id", ticketId)
    .maybeSingle();
  if (!ticket) return;
  const providerId = await sendTechEmail({
    ticketId,
    eventKey:
      nextStatus === "resolved_pending_confirmation" ? "resolution_update" : "staff_update",
    to: ticket.email,
    subject: `[EFF Tech Desk ${ticket.ticket_code}] Update Available`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#25143d"><h1 style="color:#42127f">EFF Tech Desk update</h1><p>Hello ${escapeHtml(ticket.preferred_name || ticket.requester_name)},</p><p>${escapeHtml(body).replaceAll("\n", "<br>")}</p><p>Request a secure ticket link at <a href="https://portal.estherfundsfoundation.org/tech-desk/access">portal.estherfundsfoundation.org/tech-desk/access</a>.</p><p>Reply inside your secure ticket. Never email passwords or verification codes.</p></div>`,
    text: `Hello ${ticket.preferred_name || ticket.requester_name},\n\n${body}\n\nRequest secure ticket access: https://portal.estherfundsfoundation.org/tech-desk/access`,
  });
  const now = new Date().toISOString();
  await admin.from("tech_desk_messages").insert({
    ticket_id: ticketId,
    author_user_id: user.id,
    author_type: "staff",
    author_name: "EFF Tech Desk",
    body,
    email_provider_id: providerId,
  });
  await admin
    .from("tech_desk_tickets")
    .update({
      status: nextStatus,
      last_team_message_at: now,
      resolved_at: nextStatus === "resolved_pending_confirmation" ? now : null,
      closed_at: nextStatus === "closed_by_staff" ? now : null,
      next_follow_up_at:
        nextStatus === "waiting_on_student" ||
        nextStatus === "resolved_pending_confirmation"
          ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
          : null,
      updated_at: now,
    })
    .eq("id", ticketId);
  await admin.from("tech_desk_events").insert({
    ticket_id: ticketId,
    actor_user_id: user.id,
    event_type: "staff_update_sent",
    summary_safe: `An authorized Tech Desk update was sent; status changed to ${nextStatus}.`,
  });
  revalidatePath("/tech-desk/admin");
  revalidatePath(`/tech-desk/tickets/${ticket.ticket_code}`);
}

export async function closeDuplicateTechTicket(formData: FormData) {
  const {user} = await requireTechDeskStaff();
  const ticketId = value(formData, "ticketId");
  const primaryTicketCode = value(formData, "primaryTicketCode")
    .trim()
    .toUpperCase();
  if (
    !z.string().uuid().safeParse(ticketId).success ||
    !/^EFF-TECH-\d{4}-[A-F0-9]{8}$/.test(primaryTicketCode)
  ) {
    return;
  }

  const admin = createAdminClient();
  const [{data: duplicate}, {data: primary}] = await Promise.all([
    admin
      .from("tech_desk_tickets")
      .select("id,ticket_code,email")
      .eq("id", ticketId)
      .maybeSingle(),
    admin
      .from("tech_desk_tickets")
      .select("id,ticket_code,email")
      .eq("ticket_code", primaryTicketCode)
      .maybeSingle(),
  ]);
  if (
    !duplicate ||
    !primary ||
    duplicate.id === primary.id ||
    duplicate.email.trim().toLowerCase() !== primary.email.trim().toLowerCase()
  ) {
    return;
  }

  const now = new Date().toISOString();
  await admin
    .from("tech_desk_tickets")
    .update({
      status: "closed_by_staff",
      resolved_at: now,
      closed_at: now,
      next_follow_up_at: null,
      updated_at: now,
    })
    .eq("id", duplicate.id);
  await admin.from("tech_desk_events").insert({
    ticket_id: duplicate.id,
    actor_user_id: user.id,
    event_type: "duplicate_ticket_closed",
    summary_safe: `Duplicate ticket closed without another student email; work continues in ${primary.ticket_code}.`,
    metadata_safe: {primary_ticket_id: primary.id},
  });
  revalidatePath("/tech-desk/admin");
  revalidatePath(`/tech-desk/tickets/${duplicate.ticket_code}`);
  revalidatePath(`/tech-desk/tickets/${primary.ticket_code}`);
}

export async function rerunTechDiagnosis(formData: FormData) {
  const {user} = await requireTechDeskStaff();
  const ticketId = value(formData, "ticketId");
  if (!z.string().uuid().safeParse(ticketId).success) return;
  const admin = createAdminClient();
  const {data: ticket} = await admin
    .from("tech_desk_tickets")
    .select("id,product_slug,issue_category,description,error_message,urgency")
    .eq("id", ticketId)
    .maybeSingle();
  if (!ticket) return;
  await diagnoseTechTicket(admin, ticket);
  await admin.from("tech_desk_events").insert({
    ticket_id: ticketId,
    actor_user_id: user.id,
    event_type: "diagnosis_rerun_by_staff",
    summary_safe: "An authorized staff member reran safe diagnostics and public health checks.",
  });
  revalidatePath("/tech-desk/admin");
}

export async function runTechHealthCheck(formData: FormData) {
  const {user} = await requireTechDeskStaff();
  const systemId = value(formData, "systemId");
  if (!z.string().uuid().safeParse(systemId).success) return;
  const admin = createAdminClient();
  const {data: system} = await admin
    .from("tech_desk_systems")
    .select(
      "id,slug,name,base_url,health_url,provider,vercel_project,github_repo,active",
    )
    .eq("id", systemId)
    .maybeSingle();
  if (!system) return;
  const result = await runTechSystemProbe(admin, system);
  await admin.from("tech_desk_events").insert({
    actor_user_id: user.id,
    event_type: "manual_system_probe",
    summary_safe: `Authorized public health check completed for ${system.name}: ${result.status}.`,
    metadata_safe: {system: system.slug, status: result.status},
  });
  revalidatePath("/tech-desk/admin");
  revalidatePath("/tech-desk/status");
}

export async function decideRemediationJob(formData: FormData) {
  const {user, roles} = await requireTechDeskStaff();
  const jobId = value(formData, "jobId");
  const decision = value(formData, "decision");
  if (
    !z.string().uuid().safeParse(jobId).success ||
    !["approved", "cancelled"].includes(decision)
  ) {
    return;
  }
  const admin = createAdminClient();
  const {data: job} = await admin
    .from("tech_desk_remediation_jobs")
    .select("id,ticket_id,risk_level,action_type,status")
    .eq("id", jobId)
    .maybeSingle();
  if (!job || job.status !== "proposed") return;
  const canApprovePrivileged = roles.some((role) =>
    ["tech_desk_lead", "tech_desk_admin"].includes(role),
  );
  if (job.risk_level === "privileged" && !canApprovePrivileged) return;
  await admin
    .from("tech_desk_remediation_jobs")
    .update({
      status: decision,
      approved_by: decision === "approved" ? user.id : null,
      approved_at: decision === "approved" ? new Date().toISOString() : null,
      result_safe:
        decision === "approved" && job.risk_level === "privileged"
          ? "Approved for an authorized administrator to complete in the provider console. No production mutation was executed automatically."
          : decision === "cancelled"
            ? "The proposed action was cancelled by authorized staff."
            : "Approved safe action is ready for staff execution.",
    })
    .eq("id", jobId);
  await admin.from("tech_desk_events").insert({
    ticket_id: job.ticket_id,
    actor_user_id: user.id,
    event_type: `remediation_${decision}`,
    summary_safe: `${job.action_type} was ${decision} by authorized Tech Desk staff.`,
    metadata_safe: {riskLevel: job.risk_level},
  });
  revalidatePath("/tech-desk/admin");
}
