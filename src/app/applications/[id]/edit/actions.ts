"use server";
import {randomUUID} from "node:crypto";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";

const fields=["residency_status","fafsa_completed","unmet_need_verified","undergraduate_no_bachelors","accredited_us_institution","legal_name","preferred_name","date_of_birth","gender","race_ethnicity","marital_status","personal_email","school_email","phone","address","institution","student_id","class_standing","major","expected_graduation","enrollment_status","gpa","emergency_contact_name","emergency_contact_relationship","emergency_contact_phone","emergency_contact_email","amount_requested","need_category","other_need","financial_need_description","story","faith_reflection","certification","signature"];
const uploadKinds=["headshot","enrollment_proof","financial_need_proof","supporting_document"];
export async function saveApplication(formData:FormData){
  const applicationId=String(formData.get("application_id"));const policyVersionId=String(formData.get("policy_version_id"));const intent=String(formData.get("intent")??"save");
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/sign-in");
  const answers:Record<string,string>={};for(const field of fields)answers[field]=String(formData.get(field)??"").trim();
  const admin=createAdminClient();
  const {data:owned}=await admin.from("applications").select("id,status").eq("id",applicationId).eq("applicant_id",user.id).maybeSingle();
  if(!owned||!["draft","additional_information_needed"].includes(owned.status))redirect(`/applications/${applicationId}/edit?error=${encodeURIComponent("This application is unavailable or no longer editable.")}`);
  const rows=Object.entries(answers).filter(([,value])=>value).map(([question_key,value])=>({application_id:applicationId,question_key,value,updated_at:new Date().toISOString()}));
  if(rows.length){const saved=await admin.from("application_answers").upsert(rows,{onConflict:"application_id,question_key"});if(saved.error)redirect(`/applications/${applicationId}/edit?error=${encodeURIComponent("Your answers could not be saved. Please retry; your existing saved answers remain safe.")}`)}
  await admin.from("applications").update({updated_at:new Date().toISOString()}).eq("id",applicationId).eq("applicant_id",user.id);
  for(const kind of uploadKinds){
    const file=formData.get(kind);if(!(file instanceof File)||file.size===0)continue;
    if(file.size>10485760)redirect(`/applications/${applicationId}/edit?error=${encodeURIComponent(`${kind} exceeds the 10 MB limit.`)}`);
    if(!["application/pdf","image/jpeg","image/png","image/webp"].includes(file.type))redirect(`/applications/${applicationId}/edit?error=${encodeURIComponent(`${kind} must be a PDF, JPG, PNG, or WebP file.`)}`);
    const path=`${user.id}/${applicationId}/${kind}/${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
    const uploaded=await supabase.storage.from("application-documents").upload(path,file,{contentType:file.type,upsert:false});
    if(uploaded.error)redirect(`/applications/${applicationId}/edit?error=${encodeURIComponent(`Could not upload ${file.name}. Your answers were saved; please retry the file.`)}`);
    const document=await admin.from("documents").insert({application_id:applicationId,owner_id:user.id,storage_path:path,kind,filename:file.name,content_type:file.type,size_bytes:file.size});
    if(document.error)redirect(`/applications/${applicationId}/edit?error=${encodeURIComponent(`Could not attach ${file.name}. Your answers were saved; please retry the file.`)}`);
  }
  if(intent==="submit"){const submitted=await supabase.rpc("submit_application",{p_application_id:applicationId,p_policy_version_id:policyVersionId,p_answers:answers});if(submitted.error)redirect(`/applications/${applicationId}/edit?error=${encodeURIComponent(submitted.error.message)}`);redirect(`/applications/${applicationId}?submitted=1`)}
  redirect(`/applications/${applicationId}/edit?saved=1`);
}
