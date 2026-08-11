"use server";
import {randomUUID} from "node:crypto";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {
  allApplicationAnswerKeys,
  allApplicationUploadKinds,
  friendlySubmissionError,
} from "@/lib/application-form-config";

export async function saveApplication(formData:FormData){
  const applicationId=String(formData.get("application_id"));const policyVersionId=String(formData.get("policy_version_id"));const intent=String(formData.get("intent")??"save");
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/sign-in");
  const answers:Record<string,string>={};for(const field of allApplicationAnswerKeys)answers[field]=String(formData.get(field)??"").trim();
  const admin=createAdminClient();
  const {data:owned}=await admin.from("applications").select("id,status").eq("id",applicationId).eq("applicant_id",user.id).maybeSingle();
  if(!owned||!["draft","additional_information_needed"].includes(owned.status))redirect(`/applications/${applicationId}/edit?error=${encodeURIComponent("This application is unavailable or no longer editable.")}`);
  const rows=Object.entries(answers).filter(([,value])=>value).map(([question_key,value])=>({application_id:applicationId,question_key,value,updated_at:new Date().toISOString()}));
  if(rows.length){const saved=await admin.from("application_answers").upsert(rows,{onConflict:"application_id,question_key"});if(saved.error)redirect(`/applications/${applicationId}/edit?error=${encodeURIComponent("Your answers could not be saved. Please retry; your existing saved answers remain safe.")}`)}
  await admin.from("applications").update({updated_at:new Date().toISOString()}).eq("id",applicationId).eq("applicant_id",user.id);
  for(const kind of allApplicationUploadKinds){
    const file=formData.get(kind);if(!(file instanceof File)||file.size===0)continue;
    if(file.size>10485760)redirect(`/applications/${applicationId}/edit?error=${encodeURIComponent(`${kind} exceeds the 10 MB limit.`)}`);
    if(!["application/pdf","image/jpeg","image/png","image/webp"].includes(file.type))redirect(`/applications/${applicationId}/edit?error=${encodeURIComponent(`${kind} must be a PDF, JPG, PNG, or WebP file.`)}`);
    const path=`${user.id}/${applicationId}/${kind}/${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
    const uploaded=await supabase.storage.from("application-documents").upload(path,file,{contentType:file.type,upsert:false});
    if(uploaded.error)redirect(`/applications/${applicationId}/edit?error=${encodeURIComponent(`Could not upload ${file.name}. Your answers were saved; please retry the file.`)}`);
    const document=await admin.from("documents").insert({application_id:applicationId,owner_id:user.id,storage_path:path,kind,filename:file.name,content_type:file.type,size_bytes:file.size}).select("id").single();
    if(document.error||!document.data)redirect(`/applications/${applicationId}/edit?error=${encodeURIComponent(`Could not attach ${file.name}. Your answers were saved; please retry the file.`)}`);
    await admin.from("documents").update({replaced_by:document.data.id}).eq("application_id",applicationId).eq("kind",kind).is("replaced_by",null).neq("id",document.data.id);
  }
  if(intent==="submit"){const submitted=await supabase.rpc("submit_application",{p_application_id:applicationId,p_policy_version_id:policyVersionId,p_answers:answers});if(submitted.error)redirect(`/applications/${applicationId}/edit?error=${encodeURIComponent(friendlySubmissionError(submitted.error.message))}`);redirect(`/applications/${applicationId}?submitted=1`)}
  redirect(`/applications/${applicationId}/edit?saved=1`);
}

export async function markDocumentCurrent(applicationId:string,kind:string,documentId:string){
  if(!allApplicationUploadKinds.includes(kind))throw new Error("Unsupported document type.");
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)throw new Error("Your session expired. Please sign in again.");
  const admin=createAdminClient();
  const {data:owned}=await admin.from("applications").select("id,status").eq("id",applicationId).eq("applicant_id",user.id).maybeSingle();
  if(!owned||!["draft","additional_information_needed"].includes(owned.status))throw new Error("This application is no longer editable.");
  const {data:document}=await admin.from("documents").select("id").eq("id",documentId).eq("application_id",applicationId).eq("owner_id",user.id).eq("kind",kind).maybeSingle();
  if(!document)throw new Error("The uploaded document could not be verified.");
  const {error}=await admin.from("documents").update({replaced_by:documentId}).eq("application_id",applicationId).eq("kind",kind).is("replaced_by",null).neq("id",documentId);
  if(error)throw new Error("The prior document could not be retired.");
}
