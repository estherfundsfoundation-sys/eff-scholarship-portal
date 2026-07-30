"use server";

import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";

export async function requestMyLegacyClaimInvitation() {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/sign-in?message=Sign+in+with+the+email+used+on+your+original+application.&next=/account-help");

  const {data,error}=await supabase.rpc("request_my_legacy_claim_invitation",{
    p_site_url:"https://portal.estherfundsfoundation.org",
  });
  if(error)redirect(`/account-help?recovery=${encodeURIComponent("staff_review")}`);
  redirect(`/account-help?recovery=${encodeURIComponent(String(data??"staff_review"))}`);
}
