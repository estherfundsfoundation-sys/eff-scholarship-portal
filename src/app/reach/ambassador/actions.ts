"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireReachAmbassador} from "@/lib/reach/ambassador";

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedActivityTypes = new Set(["workshop","outreach","tabling","presentation","partnership","other"]);
const clean = (value: FormDataEntryValue | null, max: number) => String(value ?? "").trim().slice(0, max);

export async function submitReachActivity(formData: FormData) {
  const {admin, user, ambassador} = await requireReachAmbassador();
  if (!ambassador) redirect("/reach/claim");

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
  for (const [index, file] of files.entries()) {
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/${submissionId}/${index + 1}-${Date.now()}.${extension}`;
    const uploaded = await admin.storage.from("reach-ambassador-uploads").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploaded.error) {
      if (uploadedPaths.length) await admin.storage.from("reach-ambassador-uploads").remove(uploadedPaths);
      redirect("/reach/ambassador?error=Your+photos+could+not+be+uploaded.+Please+try+again.");
    }
    uploadedPaths.push(path);
  }

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
    consent_confirmed: true,
  });
  if (error) {
    if (uploadedPaths.length) await admin.storage.from("reach-ambassador-uploads").remove(uploadedPaths);
    redirect("/reach/ambassador?error=Your+activity+could+not+be+saved.+Please+try+again.");
  }
  await admin.from("audit_events").insert({
    actor_id: user.id,
    action: "reach_activity_submitted",
    target_type: "reach_activity_submission",
    target_id: submissionId,
    metadata_safe: {activity_type: activityType, photo_count: uploadedPaths.length},
  });
  revalidatePath("/reach/ambassador");
  revalidatePath("/admin/reach");
  redirect("/reach/ambassador?submitted=1");
}

