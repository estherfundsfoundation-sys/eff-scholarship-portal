import {redirect} from "next/navigation";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";

export async function requireHelpDeskVolunteer(next = "/help-desk/volunteer/desk") {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) redirect("/account-help?reason=portal-unavailable");
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  const admin = createAdminClient();
  const {data: profile} = await admin
    .from("help_desk_volunteer_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) redirect("/help-desk/volunteer");
  if (profile.status === "revoked") redirect("/help-desk/volunteer?access=revoked");
  if (profile.training_score !== 100 || !profile.trained_at) redirect("/help-desk/volunteer/training");
  return {user, profile, admin};
}

export async function getHelpDeskUser() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) return {user: null, profile: null};
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return {user: null, profile: null};
  const admin = createAdminClient();
  const {data: profile} = await admin
    .from("help_desk_volunteer_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return {user, profile};
}
