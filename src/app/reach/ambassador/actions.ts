"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireReachAmbassador} from "@/lib/reach/ambassador";

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedActivityTypes = new Set(["workshop","outreach","tabling","presentation","partnership","other"]);
const clean = (value: FormDataEntryValue | null, max: number) => String(value ?? "").trim().slice(0, max);

const slugPart = (value: string) => value.toLowerCase().normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 48) || "reach-ambassador";

function normalizeInstagram(value: string) {
  if (!value) return null;
  const handle = value.replace(/^@/, "");
  if (/^[A-Za-z0-9._]{1,30}$/.test(handle)) return `https://www.instagram.com/${handle}/`;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && ["instagram.com","www.instagram.com"].includes(url.hostname)) return url.toString();
  } catch {}
  return null;
}

function normalizeLinkedIn(value: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && (url.hostname === "linkedin.com" || url.hostname.endsWith(".linkedin.com"))) return url.toString();
  } catch {}
  return null;
}

export async function submitReachProfile(formData: FormData) {
  const {admin, user, ambassador} = await requireReachAmbassador();
  if (!ambassador) redirect("/reach/claim");
  if (ambassador.application_id && !ambassador.certified_at) {
    redirect("/reach/ambassador?error=Complete+the+REACH+Ambassador+certification+before+publishing+an+official+profile.");
  }

  const displayName = clean(formData.get("displayName"), 80);
  const headline = clean(formData.get("headline"), 140);
  const institution = clean(formData.get("institution"), 160);
  const major = clean(formData.get("major"), 120);
  const classYear = clean(formData.get("classYear"), 40);
  const bio = clean(formData.get("bio"), 700);
  const whyReach = clean(formData.get("whyReach"), 700);
  const focusAreas = clean(formData.get("focusAreas"), 300).split(",")
    .map((item) => item.trim()).filter(Boolean).slice(0, 8).map((item) => item.slice(0, 50));
  const instagramInput = clean(formData.get("instagram"), 200);
  const linkedinInput = clean(formData.get("linkedin"), 300);
  const instagramUrl = normalizeInstagram(instagramInput);
  const linkedinUrl = normalizeLinkedIn(linkedinInput);
  const consentConfirmed = formData.get("profileConsent") === "on";

  if (displayName.length < 2 || institution.length < 2 || bio.length < 50) {
    redirect("/reach/ambassador?error=Complete+your+public+name,+school,+and+a+bio+of+at+least+50+characters.");
  }
  if (!consentConfirmed) redirect("/reach/ambassador?error=Confirm+that+you+want+to+publish+this+profile+in+the+public+directory.");
  if (instagramInput && !instagramUrl) redirect("/reach/ambassador?error=Enter+a+valid+Instagram+username+or+Instagram+URL.");
  if (linkedinInput && !linkedinUrl) redirect("/reach/ambassador?error=Enter+a+valid+LinkedIn+URL.");

  const {data: current} = await admin.from("reach_ambassador_profiles")
    .select("slug,private_photo_path,public_photo_path").eq("ambassador_id", ambassador.id).maybeSingle();
  const photo = formData.get("profilePhoto");
  let privatePhotoPath = current?.private_photo_path ?? null;
  let publicPhotoPath = current?.public_photo_path ?? null;
  let newPhotoPath: string | null = null;
  let newPublicPhotoPath: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    if (!acceptedTypes.has(photo.type) || photo.size > 6 * 1024 * 1024) {
      redirect("/reach/ambassador?error=Your+profile+photo+must+be+a+JPG,+PNG,+or+WEBP+file+no+larger+than+6+MB.");
    }
    const extension = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
    newPhotoPath = `${user.id}/profile/${Date.now()}.${extension}`;
    const photoBytes = new Uint8Array(await photo.arrayBuffer());
    const uploaded = await admin.storage.from("reach-ambassador-uploads").upload(newPhotoPath, photoBytes, {
      contentType: photo.type,
      upsert: false,
    });
    if (uploaded.error) redirect("/reach/ambassador?error=Your+profile+photo+could+not+be+uploaded.");
    newPublicPhotoPath = `profiles/${ambassador.id}.${extension}`;
    const published = await admin.storage.from("reach-impact-media").upload(newPublicPhotoPath, photoBytes, {
      contentType: photo.type,
      upsert: true,
    });
    if (published.error) {
      await admin.storage.from("reach-ambassador-uploads").remove([newPhotoPath]);
      redirect("/reach/ambassador?error=Your+profile+photo+could+not+be+published.");
    }
    privatePhotoPath = newPhotoPath;
    publicPhotoPath = newPublicPhotoPath;
  }

  const now = new Date().toISOString();
  const {error} = await admin.from("reach_ambassador_profiles").upsert({
    ambassador_id: ambassador.id,
    slug: current?.slug ?? `${slugPart(displayName)}-${ambassador.id.slice(0, 6)}`,
    display_name: displayName,
    headline: headline || null,
    institution,
    major: major || null,
    class_year: classYear || null,
    bio,
    why_reach: whyReach || null,
    focus_areas: focusAreas,
    instagram_url: instagramUrl,
    linkedin_url: linkedinUrl,
    private_photo_path: privatePhotoPath,
    public_photo_path: publicPhotoPath,
    consent_confirmed: true,
    status: "published",
    review_note: null,
    submitted_at: now,
    reviewed_at: now,
    reviewed_by: null,
    updated_at: now,
  }, {onConflict: "ambassador_id"});
  if (error) {
    if (newPhotoPath) await admin.storage.from("reach-ambassador-uploads").remove([newPhotoPath]);
    if (newPublicPhotoPath && newPublicPhotoPath !== current?.public_photo_path) {
      await admin.storage.from("reach-impact-media").remove([newPublicPhotoPath]);
    }
    redirect("/reach/ambassador?error=Your+public+profile+could+not+be+saved.");
  }
  if (newPhotoPath && current?.private_photo_path && current.private_photo_path !== newPhotoPath) {
    await admin.storage.from("reach-ambassador-uploads").remove([current.private_photo_path]);
  }
  if (newPublicPhotoPath && current?.public_photo_path && current.public_photo_path !== newPublicPhotoPath) {
    await admin.storage.from("reach-impact-media").remove([current.public_photo_path]);
  }
  await admin.from("audit_events").insert({
    actor_id: user.id,
    action: "reach_ambassador_profile_published",
    target_type: "reach_ambassador_profile",
    target_id: ambassador.id,
    metadata_safe: {has_photo: Boolean(privatePhotoPath), focus_area_count: focusAreas.length},
  });
  revalidatePath("/reach/ambassador");
  revalidatePath("/admin/reach");
  revalidatePath("/reach/ambassadors");
  revalidatePath(`/reach/ambassadors/${current?.slug ?? `${slugPart(displayName)}-${ambassador.id.slice(0, 6)}`}`);
  redirect("/reach/ambassador?profileSubmitted=1");
}

export async function submitReachActivity(formData: FormData) {
  const {admin, user, ambassador} = await requireReachAmbassador();
  if (!ambassador) redirect("/reach/claim");
  if (ambassador.application_id && !ambassador.certified_at) {
    redirect("/reach/ambassador?error=Complete+the+REACH+Ambassador+certification+before+representing+REACH+in+an+activity.");
  }

  const activityType = clean(formData.get("activityType"), 30);
  const title = clean(formData.get("title"), 140);
  const campus = clean(formData.get("campus"), 180);
  const activityDate = clean(formData.get("activityDate"), 10);
  const description = clean(formData.get("description"), 2400);
  const studentsValue = clean(formData.get("studentsReached"), 8);
  const studentsReached = studentsValue ? Number(studentsValue) : null;
  const consentConfirmed = formData.get("consent") === "on";

  if (!allowedActivityTypes.has(activityType) || title.length < 3 || campus.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(activityDate) || description.length < 20) {
    redirect("/reach/ambassador?error=Please+complete+every+required+activity+field.");
  }
  if (studentsReached !== null && (!Number.isInteger(studentsReached) || studentsReached < 0 || studentsReached > 100000)) {
    redirect("/reach/ambassador?error=Enter+a+valid+number+of+students+reached.");
  }
  if (!consentConfirmed) {
    redirect("/reach/ambassador?error=Please+confirm+the+photo+and+privacy+requirements.");
  }

  const files = formData.getAll("photos").filter((item): item is File => item instanceof File && item.size > 0);
  if (files.length > 6) redirect("/reach/ambassador?error=Upload+no+more+than+six+photos+per+activity.");
  if (files.some(file => !acceptedTypes.has(file.type) || file.size > 6 * 1024 * 1024)) {
    redirect("/reach/ambassador?error=Each+photo+must+be+a+JPG,+PNG,+or+WEBP+file+no+larger+than+6+MB.");
  }

  const submissionId = crypto.randomUUID();
  const uploadedPaths: string[] = [];
  const publicPaths: string[] = [];
  for (const [index, file] of files.entries()) {
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/${submissionId}/${index + 1}-${Date.now()}.${extension}`;
    const photoBytes = new Uint8Array(await file.arrayBuffer());
    const uploaded = await admin.storage.from("reach-ambassador-uploads").upload(path, photoBytes, {
      contentType: file.type,
      upsert: false,
    });
    if (uploaded.error) {
      if (uploadedPaths.length) await admin.storage.from("reach-ambassador-uploads").remove(uploadedPaths);
      if (publicPaths.length) await admin.storage.from("reach-impact-media").remove(publicPaths);
      redirect("/reach/ambassador?error=Your+photos+could+not+be+uploaded.+Please+try+again.");
    }
    uploadedPaths.push(path);
    const publicPath = `${submissionId}/${index + 1}.${extension}`;
    const published = await admin.storage.from("reach-impact-media").upload(publicPath, photoBytes, {
      contentType: file.type,
      upsert: true,
    });
    if (published.error) {
      await admin.storage.from("reach-ambassador-uploads").remove(uploadedPaths);
      if (publicPaths.length) await admin.storage.from("reach-impact-media").remove(publicPaths);
      redirect("/reach/ambassador?error=Your+photos+could+not+be+published.+Please+try+again.");
    }
    publicPaths.push(publicPath);
  }

  const now = new Date().toISOString();
  const {error} = await admin.from("reach_activity_submissions").insert({
    id: submissionId,
    ambassador_id: ambassador.id,
    user_id: user.id,
    activity_type: activityType,
    title,
    campus,
    activity_date: activityDate,
    description,
    students_reached: studentsReached,
    photo_paths: uploadedPaths,
    public_photo_paths: publicPaths,
    consent_confirmed: true,
    status: "published",
    reviewed_at: now,
  });
  if (error) {
    if (uploadedPaths.length) await admin.storage.from("reach-ambassador-uploads").remove(uploadedPaths);
    if (publicPaths.length) await admin.storage.from("reach-impact-media").remove(publicPaths);
    redirect("/reach/ambassador?error=Your+activity+could+not+be+saved.+Please+try+again.");
  }
  await admin.from("audit_events").insert({
    actor_id: user.id,
    action: "reach_activity_published",
    target_type: "reach_activity_submission",
    target_id: submissionId,
    metadata_safe: {activity_type: activityType, photo_count: publicPaths.length},
  });
  revalidatePath("/reach/ambassador");
  revalidatePath("/admin/reach");
  revalidatePath("/reach/impact");
  revalidatePath("/reach/ambassadors");
  redirect("/reach/ambassador?submitted=1");
}

