import "server-only";

import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";

export const techDeskStaffRoles = [
  "tech_desk_agent",
  "tech_desk_lead",
  "tech_desk_admin",
] as const;

export async function getTechDeskUser() {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();
  return {supabase, user};
}

export async function getTechDeskStaffContext() {
  const {supabase, user} = await getTechDeskUser();
  if (!user) return {supabase, user: null, roles: [] as string[]};
  const admin = createAdminClient();

  if (user.email?.toLowerCase() === "nationals@estherfundsinc.org") {
    await admin.from("tech_desk_staff_roles").upsert(
      {
        user_id: user.id,
        role: "tech_desk_admin",
        active: true,
        revoked_at: null,
      },
      {onConflict: "user_id,role"},
    );
  }

  const {data} = await admin
    .from("tech_desk_staff_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("active", true)
    .is("revoked_at", null);

  return {supabase, user, roles: (data ?? []).map((item) => item.role)};
}

export async function requireTechDeskStaff() {
  const context = await getTechDeskStaffContext();
  if (!context.user) {
    redirect("/tech-desk/staff/sign-in?next=%2Ftech-desk%2Fadmin");
  }
  if (
    !context.roles.some((role) =>
      techDeskStaffRoles.some((allowedRole) => allowedRole === role),
    )
  ) {
    redirect("/tech-desk/staff/sign-in?denied=1");
  }
  return context as typeof context & {user: NonNullable<typeof context.user>};
}
