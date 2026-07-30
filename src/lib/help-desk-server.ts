import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {volunteerDestination} from "@/lib/help-desk-context";

export const helpDeskStaffRoles = [
  "help_desk_agent",
  "help_desk_supervisor",
  "help_desk_quality",
  "help_desk_safety",
  "help_desk_admin",
] as const;

export async function getHelpDeskUser() {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();
  return {supabase, user};
}

export async function getHelpDeskStaffContext() {
  const {supabase, user} = await getHelpDeskUser();
  if (!user) return {supabase, user: null, roles: [] as string[]};
  const admin = createAdminClient();

  if (user.email?.toLowerCase() === "nationals@estherfundsinc.org") {
    await admin
      .from("help_desk_staff_roles")
      .upsert(
        {user_id: user.id, role: "help_desk_admin", active: true, revoked_at: null},
        {onConflict: "user_id,role"},
      );
  }

  const {data} = await admin
    .from("help_desk_staff_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("active", true)
    .is("revoked_at", null);

  return {supabase, user, roles: (data ?? []).map((item) => item.role)};
}

export async function requireHelpDeskStaff() {
  const context = await getHelpDeskStaffContext();
  if (!context.user) redirect("/help-desk/staff/sign-in?next=%2Fhelp-desk%2Fadmin");
  if (
    !context.roles.some((role) =>
      helpDeskStaffRoles.some((allowedRole) => allowedRole === role),
    )
  ) {
    redirect("/help-desk/staff/sign-in?denied=1");
  }
  return context as typeof context & {user: NonNullable<typeof context.user>};
}

export async function requireHelpDeskVolunteer() {
  const {supabase, user} = await getHelpDeskUser();
  if (!user) {
    redirect(
      "/help-desk/volunteer/sign-in?next=%2Fhelp-desk%2Fvolunteer%2Fonboarding",
    );
  }
  const admin = createAdminClient();
  const {data: profile} = await admin
    .from("help_desk_volunteer_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return {supabase, admin, user, profile};
}

export async function requireActiveHelpDeskVolunteer() {
  const context = await requireHelpDeskVolunteer();
  if (context.profile?.status !== "active") {
    redirect(
      volunteerDestination(
        context.profile?.status,
        context.profile?.onboarding_step,
      ),
    );
  }
  return context as typeof context & {
    profile: NonNullable<typeof context.profile>;
  };
}
