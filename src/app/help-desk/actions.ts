"use server";

import {createHash, randomBytes} from "node:crypto";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {z} from "zod";
import {emailFrom, getResend} from "@/lib/email";
import {escapeHtml} from "@/lib/security";
import {
  normalizeHelpDeskCaseNumber,
  safeHelpDeskDestination,
  volunteerDestination,
} from "@/lib/help-desk-context";
import {
  getHelpDeskStaffContext,
  getHelpDeskUser,
  requireActiveHelpDeskVolunteer,
  requireHelpDeskStaff,
  requireHelpDeskVolunteer,
} from "@/lib/help-desk-server";
import {
  buildVolunteerApplicationRecord,
  isHelpDeskVolunteerModuleKey,
} from "@/lib/help-desk-volunteer";
import {createAdminClient} from "@/lib/supabase/admin";

const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const emailHash = (email: string) =>
  createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

async function publicOrigin() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ||
    requestHeaders.get("host") ||
    "portal.estherfundsfoundation.org";
  return host.includes("localhost")
    ? `http://${host}`
    : "https://portal.estherfundsfoundation.org";
}

async function issueCaseAccessLink(record: {
  id: string;
  case_code: string;
  email: string;
  preferred_name: string | null;
  student_name: string;
}) {
  const admin = createAdminClient();
  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const {error: tokenError} = await admin.from("help_desk_case_access_tokens").insert({
    case_id: record.id,
    token_hash: tokenHash(rawToken),
    requested_email: record.email,
    expires_at: expiresAt,
  });
  if (tokenError) throw tokenError;

  const url = `${await publicOrigin()}/help-desk/cases/${encodeURIComponent(
    record.case_code,
  )}?access=${encodeURIComponent(rawToken)}`;
  const name = escapeHtml(record.preferred_name || record.student_name);
  const {error: emailError} = await getResend().emails.send({
    from: emailFrom,
    to: record.email,
    replyTo: "nationals@estherfundsinc.org",
    subject: "Your Secure EFF Help Desk Case Link",
    html: `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#2d1748;max-width:640px;margin:auto"><div style="background:#42127f;color:#fff;padding:24px"><strong>EFF NATIONAL STUDENT HELP DESK</strong><h1 style="margin:8px 0 0">Your secure case link</h1></div><div style="padding:28px;border:1px solid #decff0"><p>Hello ${name},</p><p>Use the secure button below to view messages, resources, next steps, and follow-up for case <strong>${record.case_code}</strong>.</p><p><a href="${url}" style="display:inline-block;background:#42127f;color:#fff;padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:700">Access My Help Desk Case</a></p><p>This link expires in 30 minutes. If it expires, request a new link from the Help Desk case-access page.</p><p>Never forward this link or email passwords, Social Security numbers, tax records, bank details, verification codes, or unredacted IDs.</p><p>Esther Funds Foundation<br><em>Every Future Fulfilled.</em></p></div></div>`,
    text: `Access EFF National Student Help Desk case ${record.case_code}: ${url}\n\nThis secure link expires in 30 minutes. Never forward it.`,
  });
  if (emailError) throw emailError;
}

export async function requestCaseAccess(formData: FormData) {
  const caseCode = normalizeHelpDeskCaseNumber(formData.get("caseNumber"));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const validEmail = z.string().email().safeParse(email).success;
  if (caseCode && validEmail) {
    const admin = createAdminClient();
    const {data: record} = await admin
      .from("student_help_cases")
      .select("id,case_code,email,preferred_name,student_name,verified_at")
      .eq("case_code", caseCode)
      .eq("email", email)
      .maybeSingle();
    if (record?.verified_at) {
      try {
        await issueCaseAccessLink(record);
        await admin.from("student_help_case_events").insert({
          case_id: record.id,
          event_type: "secure_access_link_sent",
          summary: "A time-limited Help Desk case-access link was issued.",
        });
      } catch (error) {
        console.error("Help Desk access link delivery failed", error);
      }
    }
  }
  redirect(
    "/help-desk/access?sent=1",
  );
}

export async function connectCaseToIdentity(formData: FormData) {
  const caseCode = normalizeHelpDeskCaseNumber(formData.get("caseNumber"));
  const access = String(formData.get("access") ?? "");
  const {user} = await getHelpDeskUser();
  if (!user?.email || !caseCode || !access) {
    redirect(`/help-desk/cases/${encodeURIComponent(caseCode)}?access=${encodeURIComponent(access)}`);
  }
  const admin = createAdminClient();
  const {data: record} = await admin
    .from("student_help_cases")
    .select("id,email")
    .eq("case_code", caseCode)
    .maybeSingle();
  const {data: token} = record
    ? await admin
        .from("help_desk_case_access_tokens")
        .select("id")
        .eq("case_id", record.id)
        .eq("token_hash", tokenHash(access))
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle()
    : {data: null};
  if (record && token && record.email.toLowerCase() === user.email.toLowerCase()) {
    await admin.from("student_help_cases").update({user_id: user.id}).eq("id", record.id);
    await admin.from("student_help_case_events").insert({
      case_id: record.id,
      event_type: "identity_connected",
      summary: "The student connected this Help Desk case to their verified EFF identity.",
    });
  }
  redirect(`/help-desk/cases/${encodeURIComponent(caseCode)}?access=${encodeURIComponent(access)}&connected=1`);
}

export async function sendStudentCaseMessage(formData: FormData) {
  const caseCode = normalizeHelpDeskCaseNumber(formData.get("caseNumber"));
  const access = String(formData.get("access") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!caseCode || access.length < 30 || body.length < 2 || body.length > 6000) {
    redirect(`/help-desk/access?error=${encodeURIComponent("We could not validate that message.")}`);
  }
  const admin = createAdminClient();
  const {data: record} = await admin
    .from("student_help_cases")
    .select("id,student_name,preferred_name")
    .eq("case_code", caseCode)
    .maybeSingle();
  const {data: token} = record
    ? await admin
        .from("help_desk_case_access_tokens")
        .select("id")
        .eq("case_id", record.id)
        .eq("token_hash", tokenHash(access))
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle()
    : {data: null};
  if (!record || !token) {
    redirect(`/help-desk/access?expired=1&caseNumber=${encodeURIComponent(caseCode)}`);
  }
  await admin.from("student_help_case_messages").insert({
    case_id: record.id,
    author_type: "student",
    author_name: record.preferred_name || record.student_name,
    body,
  });
  await admin
    .from("student_help_cases")
    .update({
      last_student_message_at: new Date().toISOString(),
      status: "reviewing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", record.id);
  revalidatePath(`/help-desk/cases/${caseCode}`);
  redirect(`/help-desk/cases/${caseCode}?access=${encodeURIComponent(access)}&message=sent`);
}

export async function signInHelpDeskVolunteer(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const requested = safeHelpDeskDestination(formData.get("next"), "volunteer");
  const {supabase} = await getHelpDeskUser();
  const {data, error} = await supabase.auth.signInWithPassword({email, password});
  if (error || !data.user) {
    redirect(
      `/help-desk/volunteer/sign-in?error=${encodeURIComponent(
        "That sign-in was not recognized. Check your email and password or reset your shared EFF password.",
      )}&next=${encodeURIComponent(requested)}`,
    );
  }
  const admin = createAdminClient();
  const {data: profile} = await admin
    .from("help_desk_volunteer_profiles")
    .select("status,onboarding_step")
    .eq("user_id", data.user.id)
    .maybeSingle();
  await admin.from("help_desk_security_events").insert({
    user_id: data.user.id,
    email_hash: emailHash(email),
    event_type: "volunteer_sign_in",
    metadata_safe: {requested},
  });
  redirect(
    profile
      ? volunteerDestination(profile.status, profile.onboarding_step)
      : "/help-desk/volunteer/onboarding?stage=application&new=1",
  );
}

export async function createHelpDeskVolunteerAccount(formData: FormData) {
  const legalName = String(formData.get("legalName") ?? "").trim();
  const preferredName = String(formData.get("preferredName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const timeZone = String(formData.get("timeZone") ?? "").trim();
  const ageConfirmed = formData.get("ageConfirmed") === "on";
  const personalEmailConfirmed = formData.get("personalEmailConfirmed") === "on";
  if (
    legalName.length < 2 ||
    !z.string().email().safeParse(email).success ||
    password.length < 10 ||
    !timeZone ||
    !ageConfirmed ||
    !personalEmailConfirmed
  ) {
    redirect(
      `/help-desk/volunteer/sign-in?create=1&error=${encodeURIComponent(
        "Complete every required account field and use a password of at least 10 characters.",
      )}`,
    );
  }

  const admin = createAdminClient();
  const generated = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      data: {
        legal_name: legalName,
        preferred_name: preferredName,
        help_desk_context: "volunteer",
        time_zone: timeZone,
      },
    },
  });
  if (generated.error) {
    redirect(
      `/help-desk/volunteer/sign-in?existing=1&message=${encodeURIComponent(
        "An EFF account already exists for this email. Sign in to continue your National Help Desk volunteer onboarding.",
      )}`,
    );
  }
  const hash = generated.data.properties?.hashed_token;
  if (!hash) {
    redirect("/help-desk/volunteer/sign-in?create=1&error=We+could+not+create+the+verification+link.");
  }
  const verifyUrl = new URL("/auth/secure-link", await publicOrigin());
  verifyUrl.searchParams.set("token_hash", hash);
  verifyUrl.searchParams.set("type", "signup");
  verifyUrl.searchParams.set("next", "/help-desk/volunteer/onboarding");
  const {error} = await getResend().emails.send({
    from: emailFrom,
    to: email,
    subject: "Verify Your EFF Help Desk Volunteer Account",
    html: `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#2d1748"><h1 style="color:#42127f">Verify your Help Desk volunteer account</h1><p>Hello ${escapeHtml(preferredName || legalName)},</p><p>Your verified account will connect your National Student Help Desk training, certification, shifts, assigned cases, and service-hour record.</p><p><a href="${verifyUrl}" style="display:inline-block;background:#42127f;color:white;padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:700">Verify and Continue Onboarding</a></p><p>Your secure EFF sign-in uses one password, but each EFF product keeps its own dashboard, permissions, and records.</p></div>`,
    text: `Verify your EFF National Student Help Desk volunteer account: ${verifyUrl}`,
  });
  if (error) {
    redirect("/help-desk/volunteer/sign-in?create=1&error=We+could+not+send+the+verification+email.");
  }
  redirect("/help-desk/volunteer/sign-in?message=Check+your+email+to+verify+your+Help+Desk+volunteer+account.");
}

export async function saveVolunteerApplication(formData: FormData) {
  const {admin, user} = await requireHelpDeskVolunteer();
  const legalName = String(formData.get("legalName") ?? "").trim();
  const preferredName = String(formData.get("preferredName") ?? "").trim();
  const motivation = String(formData.get("motivation") ?? "").trim();
  const experience = String(formData.get("experience") ?? "").trim();
  const availability = String(formData.get("availability") ?? "").trim();
  const timeZone = String(formData.get("timeZone") ?? "").trim();
  const agreements = formData.get("agreements") === "on";
  if (
    legalName.length < 2 ||
    motivation.length < 40 ||
    availability.length < 10 ||
    !timeZone ||
    !agreements
  ) {
    redirect("/help-desk/volunteer/onboarding?error=Complete+the+required+application+and+agreements.");
  }
  const acceptedAt = new Date().toISOString();
  const {error} = await admin.from("help_desk_volunteer_profiles").upsert(
    buildVolunteerApplicationRecord({
      userId: user.id,
      email: user.email!,
      legalName,
      preferredName,
      timeZone,
      motivation,
      experience,
      availability,
      acceptedAt,
    }),
    {onConflict: "user_id"},
  );
  if (error) {
    console.error("Help Desk volunteer application save failed", {
      code: error.code,
      message: error.message,
    });
    redirect(
      "/help-desk/volunteer/onboarding?error=Your+application+could+not+be+saved.+No+training+progress+was+lost.+Please+try+again+or+open+a+Tech+Desk+ticket.",
    );
  }
  redirect("/help-desk/volunteer/onboarding?stage=training&saved=1");
}

export async function completeVolunteerModule(formData: FormData) {
  const {admin, user, profile} = await requireHelpDeskVolunteer();
  if (!profile) redirect("/help-desk/volunteer/onboarding");
  const moduleKey = String(formData.get("moduleKey") ?? "");
  if (!isHelpDeskVolunteerModuleKey(moduleKey)) {
    redirect("/help-desk/volunteer/onboarding?stage=training");
  }
  const {error} = await admin.from("help_desk_volunteer_training").upsert(
    {
      volunteer_id: user.id,
      module_key: moduleKey,
      completed: true,
      score: 100,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {onConflict: "volunteer_id,module_key"},
  );
  if (error) {
    console.error("Help Desk volunteer module save failed", {
      code: error.code,
      message: error.message,
      moduleKey,
    });
    redirect(
      "/help-desk/volunteer/onboarding?stage=training&error=This+module+could+not+be+saved.+Please+try+again+before+continuing.",
    );
  }
  revalidatePath("/help-desk/volunteer/onboarding");
  redirect(
    `/help-desk/volunteer/onboarding?stage=training&completed=${encodeURIComponent(moduleKey)}`,
  );
}

export async function submitVolunteerAssessment(formData: FormData) {
  const {admin, user, profile} = await requireHelpDeskVolunteer();
  if (!profile) redirect("/help-desk/volunteer/onboarding");
  const correct = ["resource", "private", "escalate", "assigned"].filter(
    (key) => String(formData.get(key) ?? "") === "correct",
  ).length;
  const score = correct * 25;
  if (score < 100) {
    const {error} = await admin
      .from("help_desk_volunteer_profiles")
      .update({training_score: score, status: "training", onboarding_step: "assessment"})
      .eq("user_id", user.id);
    if (error) {
      console.error("Help Desk volunteer assessment score save failed", {
        code: error.code,
        message: error.message,
      });
      redirect(
        "/help-desk/volunteer/onboarding?stage=assessment&error=Your+assessment+could+not+be+saved.+Please+try+again.",
      );
    }
    redirect(`/help-desk/volunteer/onboarding?stage=assessment&score=${score}`);
  }
  const {count, error: countError} = await admin
    .from("help_desk_volunteer_training")
    .select("id", {count: "exact", head: true})
    .eq("volunteer_id", user.id)
    .eq("completed", true);
  if (countError) {
    console.error("Help Desk volunteer module verification failed", {
      code: countError.code,
      message: countError.message,
    });
    redirect(
      "/help-desk/volunteer/onboarding?stage=training&error=We+could+not+verify+your+completed+modules.+Please+try+again.",
    );
  }
  if ((count ?? 0) < 6) {
    redirect("/help-desk/volunteer/onboarding?stage=training&error=Complete+all+six+training+modules+before+the+assessment.");
  }
  const {error: completionError} = await admin
    .from("help_desk_volunteer_profiles")
    .update({
      training_score: 100,
      training_completed_at: new Date().toISOString(),
      status: "awaiting_approval",
      onboarding_step: "approval",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);
  if (completionError) {
    console.error("Help Desk volunteer training completion save failed", {
      code: completionError.code,
      message: completionError.message,
    });
    redirect(
      "/help-desk/volunteer/onboarding?stage=assessment&error=Your+completed+assessment+could+not+be+saved.+Please+try+again.",
    );
  }
  redirect("/help-desk/volunteer/onboarding?stage=approval&score=100");
}

export async function signInHelpDeskStaff(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const requested = safeHelpDeskDestination(formData.get("next"), "staff");
  const {supabase} = await getHelpDeskUser();
  const {data, error} = await supabase.auth.signInWithPassword({email, password});
  if (error || !data.user) {
    redirect(
      `/help-desk/staff/sign-in?error=${encodeURIComponent(
        "That sign-in was not recognized. For security, repeated failures are monitored.",
      )}`,
    );
  }
  const admin = createAdminClient();
  const context = await getHelpDeskStaffContext();
  await admin.from("help_desk_security_events").insert({
    user_id: data.user.id,
    email_hash: emailHash(email),
    event_type: context.roles.length ? "staff_sign_in" : "staff_role_denied",
    metadata_safe: {requested},
  });
  if (!context.roles.length) redirect("/help-desk/staff/sign-in?denied=1");
  redirect(requested);
}

export async function requestHelpDeskPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const context = formData.get("context") === "staff" ? "staff" : "volunteer";
  try {
    const admin = createAdminClient();
    const {data, error} = await admin.auth.admin.generateLink({type: "recovery", email});
    if (error || !data.properties?.hashed_token) throw error;
    const url = new URL("/auth/secure-link", await publicOrigin());
    url.searchParams.set("token_hash", data.properties.hashed_token);
    url.searchParams.set("type", "recovery");
    url.searchParams.set("next", `/help-desk/reset-password?context=${context}`);
    const title =
      context === "staff"
        ? "National Help Desk Staff Access"
        : "Reset Your Help Desk Volunteer Account Password";
    await getResend().emails.send({
      from: emailFrom,
      to: email,
      subject: title,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#2d1748"><h1 style="color:#42127f">${title}</h1><p>A password reset was requested for your EFF National Student Help Desk ${context} access.</p><p><a href="${url}" style="display:inline-block;background:#42127f;color:#fff;padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:700">Reset My Secure EFF Password</a></p><p>Your secure EFF sign-in uses one password, but each EFF product keeps its own dashboard, permissions, and records.</p></div>`,
      text: `${title}: ${url}`,
    });
  } catch (error) {
    console.error("Help Desk password reset delivery failed", error);
  }
  redirect(
    `/help-desk/password-reset?context=${context}&sent=1`,
  );
}

export async function updateHelpDeskPassword(formData: FormData) {
  const context = formData.get("context") === "staff" ? "staff" : "volunteer";
  const password = String(formData.get("password") ?? "");
  if (password.length < 10) {
    redirect(`/help-desk/reset-password?context=${context}&error=Password+must+be+at+least+10+characters.`);
  }
  const {supabase} = await getHelpDeskUser();
  const {error} = await supabase.auth.updateUser({password});
  if (error) {
    redirect(`/help-desk/reset-password?context=${context}&error=${encodeURIComponent(error.message)}`);
  }
  await supabase.auth.signOut();
  redirect(
    context === "staff"
      ? "/help-desk/staff/sign-in?message=Password+updated.+Sign+in+again."
      : "/help-desk/volunteer/sign-in?message=Password+updated.+Sign+in+again.",
  );
}

export async function signOutHelpDesk(formData: FormData) {
  const context = String(formData.get("context") ?? "student");
  const {supabase} = await getHelpDeskUser();
  await supabase.auth.signOut();
  if (context === "staff") redirect("/help-desk/staff/sign-in");
  if (context === "volunteer") redirect("/help-desk/volunteer");
  redirect("/help-desk");
}

export async function addStaffCaseMessage(formData: FormData) {
  const {user} = await requireHelpDeskStaff();
  const caseId = String(formData.get("caseId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!z.string().uuid().safeParse(caseId).success || body.length < 2 || body.length > 6000) return;
  const admin = createAdminClient();
  await admin.from("student_help_case_messages").insert({
    case_id: caseId,
    author_user_id: user.id,
    author_type: "staff",
    author_name: "EFF National Help Desk",
    body,
  });
  await admin
    .from("student_help_cases")
    .update({last_team_message_at: new Date().toISOString(), updated_at: new Date().toISOString()})
    .eq("id", caseId);
  revalidatePath("/help-desk/admin");
  revalidatePath(`/help-desk/admin/cases/${caseId}`);
}

export async function updateHelpDeskCaseStatus(formData: FormData) {
  const {user} = await requireHelpDeskStaff();
  const caseId = String(formData.get("caseId") ?? "");
  const status = String(formData.get("status") ?? "");
  const nextFollowUpAt = String(formData.get("nextFollowUpAt") ?? "").trim();
  const staffNote = String(formData.get("staffNote") ?? "").trim().slice(0, 4000);
  const allowed = ["new", "reviewing", "waiting_on_student", "referred_to_school", "follow_up_due", "resolved", "closed"];
  if (!z.string().uuid().safeParse(caseId).success || !allowed.includes(status)) return;
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const {data: record} = await admin
    .from("student_help_cases")
    .select("case_code")
    .eq("id", caseId)
    .maybeSingle();
  await admin.from("student_help_cases").update({
    status,
    next_follow_up_at: nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : null,
    staff_note: staffNote || null,
    assigned_staff_id: user.id,
    closed_at: ["resolved", "closed"].includes(status) ? now : null,
    updated_at: now,
  }).eq("id", caseId);
  await admin.from("student_help_case_events").insert({
    case_id: caseId,
    event_type: "staff_status_updated",
    summary: `Authorized staff changed case status to ${status.replaceAll("_", " ")}.`,
  });
  revalidatePath("/help-desk/admin");
  if (record?.case_code) revalidatePath(`/help-desk/admin/cases/${record.case_code}`);
}

export async function updateVolunteerStatus(formData: FormData) {
  const {user} = await requireHelpDeskStaff();
  const volunteerId = String(formData.get("volunteerId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (
    !z.string().uuid().safeParse(volunteerId).success ||
    !["awaiting_approval","active","recertification_required","suspended","revoked"].includes(status)
  ) return;
  const admin = createAdminClient();
  await admin
    .from("help_desk_volunteer_profiles")
    .update({
      status,
      onboarding_step: status === "active" ? "complete" : status,
      approved_at: status === "active" ? new Date().toISOString() : null,
      approved_by: status === "active" ? user.id : null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", volunteerId);
  revalidatePath("/help-desk/admin");
}

export async function logVolunteerServiceHours(formData: FormData) {
  const {admin, user} = await requireActiveHelpDeskVolunteer();
  const minutes = Number(formData.get("minutes"));
  const description = String(formData.get("description") ?? "").trim();
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440 || description.length < 5) {
    redirect("/help-desk/volunteer/console?error=Enter+valid+service+minutes+and+a+description.");
  }
  await admin.from("help_desk_service_hours").insert({
    volunteer_id: user.id,
    minutes,
    description,
  });
  revalidatePath("/help-desk/volunteer/console");
  redirect("/help-desk/volunteer/console?hours=recorded");
}
