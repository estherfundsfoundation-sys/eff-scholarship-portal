"use server";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";

export async function startApplication(formData:FormData){
 const cycleId=String(formData.get("cycle_id")??"");
 const formVersionId=String(formData.get("form_version_id")??"");
 const programSlug=String(formData.get("program_slug")??"name-your-need").replace(/[^a-z0-9-]/g,"");
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect(`/sign-in?next=/programs/${programSlug}`);
 const existing=await supabase.from("applications").select("id,status").eq("cycle_id",cycleId).eq("applicant_id",user.id).maybeSingle();
 if(existing.data)redirect(existing.data.status==="draft"?`/applications/${existing.data.id}/edit`:`/applications/${existing.data.id}`);
 if(programSlug==="name-your-need"){
  const legacy=await supabase.rpc("has_unclaimed_legacy_application");
  if(legacy.data)redirect("/account-help?existing=1");
 }
 const created=await supabase.from("applications").insert({applicant_id:user.id,cycle_id:cycleId,form_version_id:formVersionId,status:"draft"}).select("id").single();
 if(created.error)throw new Error("We could not start your application. Please try again or contact nationals@estherfundsinc.org.");
 redirect(`/applications/${created.data.id}/edit`);
}
