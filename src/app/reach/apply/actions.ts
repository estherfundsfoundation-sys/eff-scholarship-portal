"use server";

import {readFile} from "node:fs/promises";
import path from "node:path";
import {redirect} from "next/navigation";
import {z} from "zod";
import {createAdminClient} from "@/lib/supabase/admin";
import {emailFrom, getResend} from "@/lib/email";
import {buildReachAcceptanceLetter} from "@/lib/reach/acceptance-letter";

const applicationSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  preferredName: z.string().trim().max(60).optional(),
  email: z.string().trim().toLowerCase().email().max(180),
  phone: z.string().trim().max(40).optional(),
  institution: z.string().trim().min(2).max(180),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(60).optional(),
  major: z.string().trim().max(140).optional(),
  classYear: z.string().trim().max(40).optional(),
  expectedGraduation: z.string().trim().max(30).optional(),
  instagramHandle: z.string().trim().max(100).optional(),
  whyReach: z.string().trim().min(40).max(1600),
  campusNeed: z.string().trim().min(30).max(1600),
  serviceExperience: z.string().trim().max(1600).optional(),
  availabilityConfirmed: z.literal("on"),
  conductConfirmed: z.literal("on"),
  privacyConfirmed: z.literal("on"),
  communicationsConsent: z.literal("on"),
  website: z.string().max(0).optional(),
});

const value = (formData: FormData, name: string) => String(formData.get(name) ?? "");
const optional = (formData: FormData, name: string) => value(formData, name) || undefined;
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, character => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#039;",
}[character] ?? character));

export async function submitReachAmbassadorApplication(formData: FormData) {
  const parsed = applicationSchema.safeParse({
    fullName: value(formData, "fullName"),
    preferredName: optional(formData, "preferredName"),
    email: value(formData, "email"),
    phone: optional(formData, "phone"),
    institution: value(formData, "institution"),
    city: optional(formData, "city"),
    state: optional(formData, "state"),
    major: optional(formData, "major"),
    classYear: optional(formData, "classYear"),
    expectedGraduation: optional(formData, "expectedGraduation"),
    instagramHandle: optional(formData, "instagramHandle"),
    whyReach: value(formData, "whyReach"),
    campusNeed: value(formData, "campusNeed"),
    serviceExperience: optional(formData, "serviceExperience"),
    availabilityConfirmed: value(formData, "availabilityConfirmed"),
    conductConfirmed: value(formData, "conductConfirmed"),
    privacyConfirmed: value(formData, "privacyConfirmed"),
    communicationsConsent: value(formData, "communicationsConsent"),
    website: optional(formData, "website"),
  });
  if (!parsed.success) {
    redirect(`/reach/apply?error=${encodeURIComponent("Please complete every required field and confirm the ambassador commitments.")}`);
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const applicant = parsed.data;
  const {data: existingApplication} = await admin
    .from("reach_ambassador_applications")
    .select("id,welcome_sent_at")
    .eq("email", applicant.email)
    .maybeSingle();
  if (existingApplication?.welcome_sent_at) {
    redirect(`/reach/apply/accepted?name=${encodeURIComponent(applicant.preferredName || applicant.fullName)}&email=${encodeURIComponent(applicant.email)}&sent=1`);
  }
  const {data: application, error: applicationError} = await admin
    .from("reach_ambassador_applications")
    .upsert({
      full_name: applicant.fullName,
      preferred_name: applicant.preferredName || null,
      email: applicant.email,
      phone: applicant.phone || null,
      institution: applicant.institution,
      city: applicant.city || null,
      state: applicant.state || null,
      major: applicant.major || null,
      class_year: applicant.classYear || null,
      expected_graduation: applicant.expectedGraduation || null,
      instagram_handle: applicant.instagramHandle || null,
      why_reach: applicant.whyReach,
      campus_need: applicant.campusNeed,
      service_experience: applicant.serviceExperience || null,
      availability_confirmed: true,
      conduct_confirmed: true,
      privacy_confirmed: true,
      communications_consent: true,
      status: "accepted",
      accepted_at: now,
      updated_at: now,
    }, {onConflict: "email"})
    .select("id,accepted_at")
    .single();
  if (applicationError || !application) {
    console.error("REACH application could not be saved", applicationError);
    redirect(`/reach/apply?error=${encodeURIComponent("Your application could not be saved. Please try again or email nationals@estherfundsinc.org.")}`);
  }

  const {data: ambassador, error: rosterError} = await admin
    .from("reach_ambassadors")
    .upsert({
      email: applicant.email,
      full_name: applicant.fullName,
      institution: applicant.institution,
      application_id: application.id,
      active: true,
      accepted_at: application.accepted_at,
      invited_at: now,
      updated_at: now,
    }, {onConflict: "email"})
    .select("id")
    .single();
  if (rosterError || !ambassador) {
    console.error("REACH roster entry could not be saved", rosterError);
    redirect(`/reach/apply?error=${encodeURIComponent("Your application was received, but account access could not be prepared. Please email nationals@estherfundsinc.org.")}`);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.estherfundsfoundation.org";
  const claimUrl = `${baseUrl}/sign-up?next=${encodeURIComponent("/reach/claim")}`;
  const trainingUrl = `${baseUrl}/reach/ambassador/training`;
  const groupMeUrl = "https://groupme.com/join_group/115383772/RY1wMSj8";
  const canvaUrl = "https://canva.link/ylmn6n7bgocjlcp";
  const firstName = escapeHtml(applicant.preferredName || applicant.fullName.split(/\s+/)[0] || "Ambassador");
  let emailSent = false;

  try {
    let logoBytes: Uint8Array | undefined;
    try {
      logoBytes = new Uint8Array(await readFile(path.join(process.cwd(), "public", "brand", "eff-logo.png")));
    } catch {}
    const letter = await buildReachAcceptanceLetter({
      fullName: applicant.fullName,
      institution: applicant.institution,
      acceptedAt: application.accepted_at,
      logoBytes,
    });
    const sent = await getResend().emails.send({
      from: emailFrom,
      to: applicant.email,
      replyTo: "nationals@estherfundsinc.org",
      subject: "Congratulations — you are officially a REACH Campus Ambassador",
      attachments: [{
        filename: `EFF-REACH-Acceptance-${applicant.fullName.replace(/[^A-Za-z0-9]+/g, "-")}.pdf`,
        content: Buffer.from(letter),
      }],
      html: `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#2b1740;max-width:680px;margin:auto">
        <div style="background:#42127F;color:white;padding:28px"><div style="font-size:13px;letter-spacing:.12em;color:#D8C3F1;font-weight:700">ESTHER FUNDS FOUNDATION</div><h1 style="margin:8px 0 0">Welcome to REACH, ${firstName}! 💜</h1></div>
        <div style="padding:28px;border:1px solid #ded2e8">
          <p>Congratulations! Your heart to serve your campus stood out, and you have been accepted as a <strong>REACH Campus Ambassador</strong>.</p>
          <p>Your official acceptance letter is attached. Complete these steps to begin:</p>
          <ol>
            <li><strong>Claim your secure ambassador account.</strong> Use this same email address. <a href="${claimUrl}">Create or claim my account</a></li>
            <li><strong>Join the official REACH GroupMe.</strong> <a href="${groupMeUrl}">Join the ambassador group chat</a></li>
            <li><strong>Complete the EFF-hosted training.</strong> It covers the REACH pillars, student care, boxes and delivery, boundaries, workshops, professionalism, social media, reporting, and crisis response. <a href="${trainingUrl}">Open training</a></li>
            <li><strong>Introduce yourself with the official Canva template.</strong> <a href="${canvaUrl}">Open the social-media template</a></li>
          </ol>
          <div style="background:#F5F0E6;border-left:5px solid #42127F;padding:16px;margin:20px 0"><strong>Important:</strong> Do not create a separate EFF or REACH social-media page, account, group, fundraiser, logo, or public statement without written approval from the EFF National Office. Approved content may be shared from your personal account.</div>
          <p>Complete training before representing REACH in an activity or receiving program materials. Materials and box availability are confirmed by the program team and should never be promised to a student before confirmation.</p>
          <p>Welcome to the family. Let’s make sure every future is fulfilled.</p>
          <p><strong>The REACH Team</strong><br/>Esther Funds Foundation<br/><em>Every Future Fulfilled</em></p>
        </div>
      </div>`,
      text: `Congratulations, ${applicant.preferredName || applicant.fullName}!\n\nYou have been accepted as a REACH Campus Ambassador with Esther Funds Foundation. Your official acceptance letter is attached.\n\n1. Claim your account using this email: ${claimUrl}\n2. Join the GroupMe: ${groupMeUrl}\n3. Complete EFF-hosted training: ${trainingUrl}\n4. Create your introduction from the official template: ${canvaUrl}\n\nImportant: Do not create a separate EFF or REACH social-media page, account, group, fundraiser, logo, or public statement without written approval from the EFF National Office. Complete training before representing REACH in an activity or receiving program materials.\n\nThe REACH Team\nEsther Funds Foundation`,
    });
    emailSent = !sent.error;
    if (sent.error) console.error("REACH welcome email was rejected", sent.error);
  } catch (error) {
    console.error("REACH welcome email could not be sent", error);
  }

  await Promise.all([
    admin.from("reach_ambassador_applications").update({welcome_sent_at: emailSent ? now : null, updated_at: now}).eq("id", application.id),
    admin.from("reach_ambassadors").update({welcome_sent_at: emailSent ? now : null, updated_at: now}).eq("id", ambassador.id),
    admin.from("audit_events").insert({
      actor_id: null,
      action: "reach_ambassador_auto_accepted",
      target_type: "reach_ambassador",
      target_id: ambassador.id,
      metadata_safe: {welcome_email_sent: emailSent, institution: applicant.institution.slice(0, 100)},
    }),
  ]);

  redirect(`/reach/apply/accepted?name=${encodeURIComponent(applicant.preferredName || applicant.fullName)}&email=${encodeURIComponent(applicant.email)}&sent=${emailSent ? "1" : "0"}`);
}
