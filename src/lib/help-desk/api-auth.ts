import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";

export async function authenticateHelpDeskVolunteer() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const {data: profile} = await admin
    .from("help_desk_volunteer_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile || profile.status === "revoked" || profile.training_score !== 100 || !profile.trained_at) return null;
  return {user, profile, admin};
}
