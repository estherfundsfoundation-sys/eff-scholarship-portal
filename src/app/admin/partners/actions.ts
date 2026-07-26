"use server";

import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireAdmin} from "@/lib/auth/staff";
import {createAdminClient} from "@/lib/supabase/admin";

export async function reviewPartner(formData:FormData){
  const {user}=await requireAdmin();
  const institutionId=String(formData.get("institutionId")??"");
  const decision=String(formData.get("decision")??"");
  const allowed=["approved","active","paused","declined"];
  if(!allowed.includes(decision))redirect("/admin/partners?error=Invalid+partnership+decision.");
  const admin=createAdminClient();
  const now=new Date().toISOString();
  const updates={
    status:decision,
    public_profile:decision==="active",
    designation:String(formData.get("designation")??"partner")==="institute"?"institute":"partner",
    reviewed_by:user.id,
    reviewed_at:now,
    approved_at:["approved","active"].includes(decision)?now:null,
    updated_at:now
  };
  const {error}=await admin.from("eff_partner_institutions").update(updates).eq("id",institutionId);
  if(error)redirect("/admin/partners?error=The+partnership+could+not+be+updated.");
  await admin.from("eff_partner_activity").insert({
    institution_id:institutionId,actor_id:user.id,action:`partnership_${decision}`,
    detail_safe:{designation:updates.designation}
  });
  revalidatePath("/admin/partners");
  revalidatePath("/partners");
  revalidatePath("/partners/directory");
  redirect("/admin/partners?saved=1");
}
