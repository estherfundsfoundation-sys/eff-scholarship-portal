"use server";

import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";

export async function recoverImportedApplication() {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/sign-in?next=/portal-checkup");
  const {data,error}=await supabase.rpc("request_my_legacy_claim_invitation",{p_site_url:"https://portal.estherfundsfoundation.org"});
  redirect(`/portal-checkup?recovery=${encodeURIComponent(error?"staff_review":String(data??"staff_review"))}`);
}
