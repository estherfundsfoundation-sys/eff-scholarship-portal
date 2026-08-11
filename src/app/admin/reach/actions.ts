"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireAdmin} from "@/lib/auth/staff";
import {emailFrom, getResend} from "@/lib/email";
import {createReachClaimToken} from "@/lib/reach/claim-token";
import {createAdminClient} from "@/lib/supabase/admin";

const clean = (value: FormDataEntryValue | null, max: number) => String(value ?? "").trim().slice(0, max);

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, character => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#039;",
}[character] ?? character));

export async function inviteReachAmbassador(formData: FormData) {
  const {user} = await requireAdmin();
  const admin = createAdminClient();
  const fullName = clean(formData.get("fullName"), 100);
  const email = clean(formData.get("email"), 320).toLowerCase();
  const institution = clean(formData.get("institution"), 180);
  if (fullName.length < 2 || institution.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect("/admin/reach?error=Enter+the+ambassador%27s+name%2C+institution%2C+and+a+valid+invitation+email.");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const {token, tokenHash} = createReachClaimToken();
  const {data: ambassador, error: rosterError} = await admin
    .from("reach_ambassadors")
    .upsert({
      email,
      full_name: fullName,
      institution,
      active: true,
      invited_at: now.toISOString(),
      accepted_at: now.toISOString(),
      claim_token_hash: tokenHash,
      claim_token_expires_at: expiresAt,
      claim_link_sent_at: now.toISOString(),
      updated_at: now.toISOString(),
    }, {onConflict: "email"})
    .select("id,email,full_name,user_id,claimed_at")
    .single();
  if (rosterError || !ambassador) {
    redirect("/admin/reach?error=The+ambassador+record+could+not+be+prepared.");
  }

  const claimUrl = new URL("/reach/claim", process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.estherfundsfoundation.org");
  claimUrl.searchParams.set("token", token);
  const firstName = escapeHtml(fullName.split(/\s+/)[0] || "Ambassador");
  const delivery = await getResend().emails.send({
    from: emailFrom,
    to: email,
    replyTo: "nationals@estherfundsinc.org",
    subject: "Set up your EFF REACH Ambassador account",
    html: `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#2b1740;max-width:680px;margin:auto">
      <div style="background:#42127F;color:#fff;padding:28px"><div style="font-size:13px;letter-spacing:.12em;color:#D8C3F1;font-weight:700">ESTHER FUNDS FOUNDATION · REACH</div><h1 style="margin:8px 0 0">Your ambassador account is ready</h1></div>
      <div style="padding:28px;border:1px solid #ded2e8">
        <p>Hello ${firstName},</p>
        <p>Welcome to REACH! We have prepared your official EFF REACH Campus Ambassador account for <strong>${escapeHtml(institution)}</strong>.</p>
        <p><a href="${claimUrl.toString()}" style="display:inline-block;background:#42127F;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">Set up my REACH account</a></p>
        <p>Open the button above, then sign in with an existing EFF Portal account or create one using any email address you control. After connecting the invitation, your ambassador workspace will be available in the portal.</p>
        <p>The private link expires in 24 hours. Please do not forward it or share passwords or verification codes. If an email-security page opens first, choose <strong>Continue Securely</strong>.</p>
        <p>Your REACH Action Hub is available at <a href="https://reach.estherfundsfoundation.org/">reach.estherfundsfoundation.org</a>.</p>
        <p><strong>The REACH Team</strong><br/>Esther Funds Foundation</p>
      </div>
    </div>`,
    text: `Hello ${fullName.split(/\s+/)[0] || "Ambassador"},\n\nWelcome to REACH! We prepared your official EFF REACH Campus Ambassador account for ${institution}.\n\nSet up your account with this private link:\n${claimUrl.toString()}\n\nOpen the link, then sign in with an existing EFF Portal account or create one using any email you control. The link expires in 24 hours. Do not forward it or share passwords or verification codes.\n\nREACH Action Hub: https://reach.estherfundsfoundation.org/\n\nThe REACH Team\nEsther Funds Foundation`,
  });
  if (delivery.error) {
    await admin.from("reach_ambassadors").update({
      claim_token_hash: null,
      claim_token_expires_at: null,
      claim_link_sent_at: null,
      updated_at: new Date().toISOString(),
    }).eq("id", ambassador.id).eq("claim_token_hash", tokenHash);
    redirect("/admin/reach?error=The+roster+was+updated%2C+but+the+private+setup+email+could+not+be+sent.");
  }

  await admin.from("audit_events").insert({
    actor_id: user.id,
    action: ambassador.claimed_at ? "reach_ambassador_reinvited" : "reach_ambassador_invited_by_admin",
    target_type: "reach_ambassador",
    target_id: ambassador.id,
    metadata_safe: {institution: institution.slice(0, 100), already_claimed: Boolean(ambassador.claimed_at)},
  });
  revalidatePath("/admin/reach");
  redirect(`/admin/reach?invited=${encodeURIComponent(email)}`);
}

export async function addReachResource(formData: FormData) {
  const {user} = await requireAdmin();
  const admin = createAdminClient();
  const title = clean(formData.get("title"), 180);
  const description = clean(formData.get("description"), 800);
  const category = clean(formData.get("category"), 100) || "Workshop toolkit";
  const resourceUrl = clean(formData.get("resourceUrl"), 1000);
  try { new URL(resourceUrl); } catch { redirect("/admin/reach?error=Enter+a+valid+resource+URL."); }
  if (title.length < 3) redirect("/admin/reach?error=Enter+a+resource+title.");
  const {error} = await admin.from("reach_resources").insert({title,description:description||null,category,resource_url:resourceUrl,created_by:user.id});
  if (error) redirect("/admin/reach?error=The+resource+could+not+be+saved.");
  revalidatePath("/admin/reach");
  revalidatePath("/reach/ambassador");
  redirect("/admin/reach?resource=1");
}

export async function setReachResourceActive(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  const id = clean(formData.get("resourceId"), 80);
  const active = clean(formData.get("active"), 10) === "true";
  await admin.from("reach_resources").update({active,updated_at:new Date().toISOString()}).eq("id",id);
  revalidatePath("/admin/reach");
  revalidatePath("/reach/ambassador");
}

export async function reviewReachActivity(formData: FormData) {
  const {user} = await requireAdmin();
  const admin = createAdminClient();
  const id = clean(formData.get("submissionId"), 80);
  const decision = clean(formData.get("decision"), 30);
  const reviewNote = clean(formData.get("reviewNote"), 1000);
  const {data: submission} = await admin.from("reach_activity_submissions").select("id,photo_paths").eq("id",id).single();
  if (!submission) redirect("/admin/reach?error=Submission+not+found.");

  const publicPaths: string[] = [];
  let status = decision;
  if (decision === "published") {
    const privatePaths = Array.isArray(submission.photo_paths) ? submission.photo_paths.filter((value): value is string => typeof value === "string") : [];
    for (const [index, privatePath] of privatePaths.entries()) {
      const downloaded = await admin.storage.from("reach-ambassador-uploads").download(privatePath);
      if (downloaded.error || !downloaded.data) redirect("/admin/reach?error=One+or+more+photos+could+not+be+prepared+for+publication.");
      const extension = privatePath.split(".").pop()?.toLowerCase() || "jpg";
      const publicPath = `${id}/${index + 1}.${extension}`;
      const uploaded = await admin.storage.from("reach-impact-media").upload(publicPath, downloaded.data, {upsert:true,contentType:downloaded.data.type || undefined});
      if (uploaded.error) redirect("/admin/reach?error=One+or+more+photos+could+not+be+published.");
      publicPaths.push(publicPath);
    }
    status = "published";
  }
  if (!["approved","published","changes_requested","not_published"].includes(status)) redirect("/admin/reach?error=Choose+a+valid+review+decision.");
  const now = new Date().toISOString();
  const {error} = await admin.from("reach_activity_submissions").update({
    status,
    review_note: reviewNote || null,
    public_photo_paths: publicPaths,
    reviewed_by: user.id,
    reviewed_at: now,
    updated_at: now,
  }).eq("id", id);
  if (error) redirect("/admin/reach?error=The+review+could+not+be+saved.");
  await admin.from("audit_events").insert({actor_id:user.id,action:`reach_activity_${status}`,target_type:"reach_activity_submission",target_id:id,metadata_safe:{photo_count:publicPaths.length}});
  revalidatePath("/admin/reach");
  revalidatePath("/reach/ambassador");
  revalidatePath("/reach/impact");
  redirect("/admin/reach?reviewed=1");
}

export async function reviewReachAmbassadorProfile(formData: FormData) {
  const {user} = await requireAdmin();
  const admin = createAdminClient();
  const ambassadorId = clean(formData.get("ambassadorId"), 80);
  const decision = clean(formData.get("decision"), 30);
  const reviewNote = clean(formData.get("reviewNote"), 1000);
  if (!["published", "changes_requested", "private"].includes(decision)) {
    redirect("/admin/reach?error=Choose+a+valid+profile+review+decision.");
  }

  const {data: profile} = await admin
    .from("reach_ambassador_profiles")
    .select("ambassador_id,slug,private_photo_path,public_photo_path")
    .eq("ambassador_id", ambassadorId)
    .single();
  if (!profile) redirect("/admin/reach?error=Ambassador+profile+not+found.");

  let publicPhotoPath = profile.public_photo_path;
  if (decision === "published" && profile.private_photo_path) {
    const downloaded = await admin.storage.from("reach-ambassador-uploads").download(profile.private_photo_path);
    if (downloaded.error || !downloaded.data) {
      redirect("/admin/reach?error=The+profile+photo+could+not+be+prepared+for+publication.");
    }
    const extension = profile.private_photo_path.split(".").pop()?.toLowerCase() || "jpg";
    publicPhotoPath = `profiles/${ambassadorId}.${extension}`;
    const uploaded = await admin.storage.from("reach-impact-media").upload(publicPhotoPath, downloaded.data, {
      upsert: true,
      contentType: downloaded.data.type || undefined,
    });
    if (uploaded.error) {
      redirect("/admin/reach?error=The+profile+photo+could+not+be+published.");
    }
  }

  const now = new Date().toISOString();
  const {error} = await admin.from("reach_ambassador_profiles").update({
    status: decision,
    review_note: reviewNote || null,
    public_photo_path: publicPhotoPath,
    reviewed_at: now,
    reviewed_by: user.id,
    updated_at: now,
  }).eq("ambassador_id", ambassadorId);
  if (error) redirect("/admin/reach?error=The+profile+review+could+not+be+saved.");

  await admin.from("audit_events").insert({
    actor_id: user.id,
    action: `reach_ambassador_profile_${decision}`,
    target_type: "reach_ambassador_profile",
    target_id: ambassadorId,
    metadata_safe: {slug: profile.slug, has_public_photo: Boolean(publicPhotoPath)},
  });
  revalidatePath("/admin/reach");
  revalidatePath("/reach/ambassador");
  revalidatePath("/reach/ambassadors");
  revalidatePath(`/reach/ambassadors/${profile.slug}`);
  redirect("/admin/reach?profileReviewed=1");
}

