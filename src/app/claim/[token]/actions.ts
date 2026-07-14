"use server";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
export async function claimLegacy(formData:FormData){const token=String(formData.get("token")??"");const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect(`/sign-in?next=/claim/${encodeURIComponent(token)}`);const result=await supabase.rpc("claim_legacy_application",{p_token:token});if(result.error)throw new Error(result.error.message);redirect(`/applications/${result.data}`)}
