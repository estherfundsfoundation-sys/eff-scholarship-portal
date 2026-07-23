"use server";

import {revalidatePath} from "next/cache";
import {requireAdmin} from "@/lib/auth/staff";

export async function queueInvitations(formData: FormData) {
  const {supabase} = await requireAdmin();
  const limit = Math.min(5000, Math.max(1, Number(formData.get("limit") ?? 100)));
  const siteUrl = "https://portal.estherfundsfoundation.org";
  const {error} = await supabase.rpc("queue_legacy_claim_invitations", {p_limit: limit, p_site_url: siteUrl});
  if (error) throw new Error("The invitation batch could not be queued safely.");
  revalidatePath("/admin/imports");
}

export async function resendInvitation(formData:FormData){
  const {supabase}=await requireAdmin();
  const legacyRecordId=String(formData.get("legacy_record_id")??"");
  const {error}=await supabase.rpc("resend_legacy_claim_invitation",{p_legacy_record_id:legacyRecordId,p_site_url:"https://portal.estherfundsfoundation.org"});
  if(error)throw new Error(error.message);
  revalidatePath("/admin/imports");
}
