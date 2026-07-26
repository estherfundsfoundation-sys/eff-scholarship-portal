"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireAdmin} from "@/lib/auth/staff";
import {createAdminClient} from "@/lib/supabase/admin";

const clean = (value: FormDataEntryValue | null, max: number) => String(value ?? "").trim().slice(0, max);

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

