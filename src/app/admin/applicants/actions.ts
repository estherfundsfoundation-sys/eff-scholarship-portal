"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth/staff";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireSuccess(label: string, operation: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await operation;
  if (error) throw new Error(`${label}: ${error.message}`);
}

export async function deleteDraftOnlyAccount(formData: FormData) {
  const { user: actor } = await requireSuperAdmin();
  const userId = String(formData.get("user_id") ?? "").trim();
  const emailConfirmation = String(formData.get("email_confirmation") ?? "").trim().toLowerCase();
  const confirmation = String(formData.get("confirmation") ?? "").trim().toUpperCase();
  if (!userId || confirmation !== "DELETE ACCOUNT") throw new Error("Type DELETE ACCOUNT to confirm permanent deletion.");

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,primary_email,applications(id,status,submitted_at),user_roles!user_roles_user_id_fkey(role)")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!profile) redirect("/admin/applicants?message=Account+was+already+deleted");
  if (String(profile.primary_email ?? "").toLowerCase() !== emailConfirmation) throw new Error("The email confirmation does not match this account.");
  if ((profile.user_roles ?? []).length) throw new Error("Staff accounts cannot be deleted from the applicant directory.");

  const applications = (profile.applications ?? []) as Array<{ id: string; status: string; submitted_at: string | null }>;
  if (applications.some((item) => item.status !== "draft" || item.submitted_at)) {
    throw new Error("This account has a submitted or retained application and requires a records-retention review.");
  }
  const applicationIds = applications.map((item) => item.id);

  const { data: documents, error: documentError } = await admin.from("documents").select("storage_path").eq("owner_id", userId);
  if (documentError) throw new Error(documentError.message);
  const storagePaths = (documents ?? []).map((item) => item.storage_path).filter(Boolean);
  if (storagePaths.length) {
    const { error } = await admin.storage.from("application-documents").remove(storagePaths);
    if (error) throw new Error(`Stored documents: ${error.message}`);
  }

  if (applicationIds.length) {
    const { data: assignments, error: assignmentError } = await admin.from("review_assignments").select("id").in("application_id", applicationIds);
    if (assignmentError) throw new Error(assignmentError.message);
    const assignmentIds = (assignments ?? []).map((item) => item.id);
    if (assignmentIds.length) await requireSuccess("Reviews", admin.from("reviews").delete().in("assignment_id", assignmentIds));
    for (const table of ["review_assignments", "decision_revisions", "awards", "decisions", "information_requests", "internal_notes", "status_history", "policy_acceptances", "claim_invitations", "messages", "application_history_events", "legacy_document_references"]) {
      await requireSuccess(table, admin.from(table).delete().in("application_id", applicationIds));
    }
    await requireSuccess("Import links", admin.from("import_rows").update({ application_id: null }).in("application_id", applicationIds));
    await requireSuccess("Legacy application links", admin.from("legacy_application_records").update({ application_id: null, claimed_by: null, status: "committed" }).in("application_id", applicationIds));
    await requireSuccess("Applications", admin.from("applications").delete().in("id", applicationIds));
  }

  await requireSuccess("Bookmarks", admin.from("bookmarks").delete().eq("user_id", userId));
  await requireSuccess("Audit actor references", admin.from("audit_events").update({ actor_id: null }).eq("actor_id", userId));
  await requireSuccess("Role grant references", admin.from("user_roles").update({ granted_by: null }).eq("granted_by", userId));
  await requireSuccess("Legacy owner references", admin.from("legacy_application_records").update({ claimed_by: null }).eq("claimed_by", userId));
  await requireSuccess("History actor references", admin.from("application_history_events").update({ actor_id: null }).eq("actor_id", userId));
  await requireSuccess("Scholarship exception references", admin.from("scholarship_exceptions").update({ resolved_by: null }).eq("resolved_by", userId));
  await requireSuccess("Scholarship report references", admin.from("scholarship_reports").update({ resolved_by: null }).eq("resolved_by", userId));

  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) throw new Error(`Authentication account: ${authError.message}`);
  await requireSuccess("Deletion audit", admin.from("audit_events").insert({
    actor_id: actor.id,
    action: "draft_account_deleted",
    target_type: "applicant_account",
    target_id: userId,
    metadata_safe: { request_channel: "verified_account_email", applications_deleted: applicationIds.length, documents_deleted: storagePaths.length },
  }));
  revalidatePath("/admin/applicants");
  redirect("/admin/applicants?message=Draft-only+account+deleted+and+audited");
}
