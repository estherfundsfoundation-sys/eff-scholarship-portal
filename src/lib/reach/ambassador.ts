import "server-only";
import {redirect} from "next/navigation";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";

export async function requireReachAmbassador(next = "/reach/ambassador") {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user?.email) redirect(`/sign-in?next=${encodeURIComponent(next)}`);

  const admin = createAdminClient();
  const email = user.email.trim().toLowerCase();
  const selection = "id,email,login_email,full_name,institution,user_id,active,invited_at,claimed_at,application_id,accepted_at,training_started_at,training_completed_at,training_score,certified_at,certificate_code";
  const {data: connected} = await admin
    .from("reach_ambassadors")
    .select(selection)
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  const {data: emailMatch} = connected ? {data: null} : await admin
    .from("reach_ambassadors")
    .select(selection)
    .eq("email", email)
    .eq("active", true)
    .maybeSingle();
  const ambassador = connected ?? emailMatch;

  if (!ambassador) {
    return {supabase, admin, user, ambassador: null};
  }
  if (ambassador.user_id && ambassador.user_id !== user.id) {
    return {supabase, admin, user, ambassador: null};
  }
  if (!ambassador.user_id) {
    const now = new Date().toISOString();
    const {data: claimed, error} = await admin
      .from("reach_ambassadors")
      .update({user_id: user.id, login_email: email, claimed_at: now, updated_at: now})
      .eq("id", ambassador.id)
      .is("user_id", null)
      .select(selection)
      .single();
    if (error || !claimed) {
      return {supabase, admin, user, ambassador: null};
    }
    await admin.from("audit_events").insert({
      actor_id: user.id,
      action: "reach_ambassador_account_claimed",
      target_type: "reach_ambassador",
      target_id: ambassador.id,
      metadata_safe: {email_domain: email.split("@")[1] ?? "unknown"},
    });
    return {supabase, admin, user, ambassador: claimed};
  }
  return {supabase, admin, user, ambassador};
}

