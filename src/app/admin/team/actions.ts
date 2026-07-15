"use server";
import {revalidatePath} from "next/cache";
import {createAdminClient} from "@/lib/supabase/admin";
import {requireSuperAdmin} from "@/lib/auth/staff";

const allowedRoles = new Set(["reviewer", "finance", "program_admin", "super_admin"]);

export async function inviteStaff(formData: FormData) {
  const {supabase, user} = await requireSuperAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");
  if (!/^\S+@\S+\.\S+$/.test(email) || !allowedRoles.has(role)) throw new Error("Enter a valid email and role.");
  const admin = createAdminClient();
  let profileId: string | undefined;
  const {data: existing} = await supabase.from("profiles").select("id").eq("primary_email", email).maybeSingle();
  profileId = existing?.id;
  if (!profileId) {
    const site = "https://portal.estherfundsfoundation.org";
    const invitation = await admin.auth.admin.inviteUserByEmail(email, {redirectTo: `${site}/auth/callback?next=/admin`});
    if (invitation.error || !invitation.data.user) throw new Error("The staff invitation could not be sent.");
    profileId = invitation.data.user.id;
  }
  const {data: existingRole} = await supabase.from("user_roles").select("id").eq("user_id", profileId).eq("role", role).is("program_id", null).maybeSingle();
  if (!existingRole) {const {error} = await supabase.from("user_roles").insert({user_id: profileId, role, granted_by: user.id});if (error) throw new Error("The role could not be granted.");}
  await supabase.from("audit_events").insert({actor_id: user.id, action: "staff_role_granted", target_type: "profile", target_id: profileId, metadata_safe: {role}});
  revalidatePath("/admin/team");
}
