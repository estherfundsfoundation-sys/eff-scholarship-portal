"use server";
import {randomUUID} from "node:crypto";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireAdmin} from "@/lib/auth/staff";
import {createAdminClient} from "@/lib/supabase/admin";

const correctionDocumentKinds = ["enrollment_proof", "financial_need_proof"] as const;
const allowedCorrectionTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const allowedImportHost=(hostname:string)=>hostname.endsWith(".oaiusercontent.com");

export async function correctInstitutionAndDocuments(formData:FormData){
  const {user}=await requireAdmin();
  const admin=createAdminClient();
  const id=String(formData.get("application_id")??"");
  const institution=String(formData.get("institution")??"").trim();
  const reason=String(formData.get("reason")??"").trim();
  if(institution.length<2||institution.length>180)throw new Error("Enter the verified institution name.");
  if(reason.length<12)throw new Error("Record a clear correction reason for the audit trail.");
  const {data:application,error:applicationError}=await admin.from("applications").select("id,applicant_id,profiles!applications_applicant_id_fkey(institution)").eq("id",id).single();
  if(applicationError||!application)throw new Error("The application could not be found.");
  const profile=application.profiles as unknown as {institution:string|null};
  const files=[] as Array<{kind:(typeof correctionDocumentKinds)[number];filename:string;contentType:string;size:number;body:File|ArrayBuffer}>;
  for(const kind of correctionDocumentKinds){
    const file=formData.get(kind);
    if(file instanceof File&&file.size>0){
      if(file.size>10485760)throw new Error(`${kind.replaceAll("_"," ")} exceeds the 10 MB limit.`);
      if(!allowedCorrectionTypes.has(file.type))throw new Error(`${kind.replaceAll("_"," ")} must be a PDF, JPG, PNG, or WebP file.`);
      files.push({kind,filename:file.name,contentType:file.type,size:file.size,body:file});
      continue;
    }
    const source=String(formData.get(`${kind}_source_url`)??"").trim();
    if(!source)continue;
    const sourceName=String(formData.get(`${kind}_source_filename`)??"").trim().replace(/[^a-zA-Z0-9._-]/g,"_");
    let sourceUrl:URL;
    try{sourceUrl=new URL(source);}catch{throw new Error(`The ${kind.replaceAll("_"," ")} source URL is invalid.`)}
    if(sourceUrl.protocol!=="https:"||!allowedImportHost(sourceUrl.hostname))throw new Error("Staff document imports must use an approved time-limited attachment source.");
    const response=await fetch(sourceUrl,{redirect:"follow",signal:AbortSignal.timeout(20000)});
    const finalUrl=new URL(response.url);
    const contentType=(response.headers.get("content-type")??"").split(";")[0].toLowerCase();
    if(!response.ok||finalUrl.protocol!=="https:"||!allowedImportHost(finalUrl.hostname)||!allowedCorrectionTypes.has(contentType))throw new Error(`The ${kind.replaceAll("_"," ")} source could not be verified.`);
    const body=await response.arrayBuffer();
    if(body.byteLength===0||body.byteLength>10485760)throw new Error(`The ${kind.replaceAll("_"," ")} source must be between 1 byte and 10 MB.`);
    files.push({kind,filename:sourceName||`${kind}.${contentType==="application/pdf"?"pdf":contentType.split("/")[1]||"bin"}`,contentType,size:body.byteLength,body});
  }
  const now=new Date().toISOString();
  const profileUpdate=await admin.from("profiles").update({institution,updated_at:now}).eq("id",application.applicant_id);
  const answerUpdate=await admin.from("application_answers").upsert({application_id:id,question_key:"institution",value:institution,updated_at:now},{onConflict:"application_id,question_key"});
  if(profileUpdate.error||answerUpdate.error)throw new Error("The institution correction could not be saved.");
  const replacedKinds:string[]=[];
  for(const {kind,filename,contentType,size,body} of files){
    const safeName=filename.replace(/[^a-zA-Z0-9._-]/g,"_");
    const path=`${application.applicant_id}/${id}/${kind}/${randomUUID()}-${safeName}`;
    const uploaded=await admin.storage.from("application-documents").upload(path,body,{contentType,upsert:false});
    if(uploaded.error)throw new Error(`Could not upload ${filename}. The institution correction was saved, but the document was not replaced.`);
    const inserted=await admin.from("documents").insert({application_id:id,owner_id:application.applicant_id,storage_path:path,kind,filename,content_type:contentType,size_bytes:size}).select("id").single();
    if(inserted.error||!inserted.data){
      await admin.storage.from("application-documents").remove([path]);
      throw new Error(`Could not attach ${filename}. The institution correction was saved, but the document was not replaced.`);
    }
    const replaced=await admin.from("documents").update({replaced_by:inserted.data.id}).eq("application_id",id).eq("kind",kind).is("replaced_by",null).neq("id",inserted.data.id);
    if(replaced.error)throw new Error(`The new ${kind.replaceAll("_"," ")} was attached, but the prior document could not be retired.`);
    replacedKinds.push(kind);
  }
  await admin.from("internal_notes").insert({application_id:id,author_id:user.id,body:`Verified staff correction: institution changed from ${profile?.institution||"not recorded"} to ${institution}. ${replacedKinds.length?`Replaced ${replacedKinds.map(item=>item.replaceAll("_"," ")).join(" and ")}.`:"No documents were replaced."} Reason: ${reason}`});
  await admin.from("audit_events").insert({actor_id:user.id,action:"application_institution_documents_corrected",target_type:"application",target_id:id,metadata_safe:{institution_from:profile?.institution||null,institution_to:institution,replaced_document_kinds:replacedKinds,reason}});
  revalidatePath(`/admin/applications/${id}`);
  revalidatePath(`/applications/${id}`);
  redirect(`/admin/applications/${id}?correction_saved=1`);
}

export async function transitionApplication(formData: FormData) {const {supabase}=await requireAdmin();const id=String(formData.get("application_id"));const result=await supabase.rpc("staff_transition_application",{p_application_id:id,p_new_status:String(formData.get("new_status")),p_reason:String(formData.get("reason")??""),p_applicant_note:String(formData.get("applicant_note")??"")});if(result.error)redirect(`/admin/applications/${id}?status_error=${encodeURIComponent(result.error.message)}`);revalidatePath(`/admin/applications/${id}`);revalidatePath("/admin/applications");redirect(`/admin/applications/${id}?status_updated=1`)}
export async function addInternalNote(formData: FormData) {const {supabase,user}=await requireAdmin();const id=String(formData.get("application_id"));const body=String(formData.get("body")??"").trim();if(body)await supabase.from("internal_notes").insert({application_id:id,author_id:user.id,body});revalidatePath(`/admin/applications/${id}`)}
export async function requestInformation(formData: FormData) {const {supabase,user}=await requireAdmin();const id=String(formData.get("application_id"));const item=String(formData.get("item")??"").trim();const due=String(formData.get("due_at")??"")||null;if(item){await supabase.from("information_requests").insert({application_id:id,requested_by:user.id,item,due_at:due});await supabase.rpc("staff_transition_application",{p_application_id:id,p_new_status:"additional_information_needed",p_reason:"Additional information requested",p_applicant_note:item})}revalidatePath(`/admin/applications/${id}`)}
export async function recordAward(formData: FormData) {const {supabase,user}=await requireAdmin();const id=String(formData.get("application_id"));const amount=Number(formData.get("amount"));if(!Number.isFinite(amount)||amount<=0)throw new Error("Enter a valid award amount.");const {data:application}=await supabase.from("applications").select("status").eq("id",id).single();if(application?.status!=="approved")throw new Error("Approve the application before issuing an award.");const award={application_id:id,amount,conditions:String(formData.get("conditions")??"").trim()||null,acceptance_deadline:String(formData.get("acceptance_deadline")??"")||null,disbursement_status:"pending_acceptance",scheduled_date:String(formData.get("scheduled_date")??"")||null};const {error}=await supabase.from("awards").upsert(award,{onConflict:"application_id"});if(error)throw new Error("The award could not be saved.");await supabase.from("audit_events").insert({actor_id:user.id,action:"award_recorded",target_type:"application",target_id:id,metadata_safe:{amount,acceptance_deadline:award.acceptance_deadline}});revalidatePath(`/admin/applications/${id}`);revalidatePath(`/applications/${id}`)}
export async function assignReviewer(formData: FormData) {const {supabase}=await requireAdmin();const id=String(formData.get("application_id"));const reviewerId=String(formData.get("reviewer_id"));const {error}=await supabase.rpc("assign_application_reviewer",{p_application_id:id,p_reviewer_id:reviewerId});if(error)throw new Error(error.message);revalidatePath(`/admin/applications/${id}`);revalidatePath("/admin/reviews")}
export async function correctStatus(formData:FormData){const {supabase}=await requireAdmin();const id=String(formData.get("application_id"));const {error}=await supabase.rpc("correct_application_status",{p_application_id:id,p_new_status:String(formData.get("new_status")),p_reason:String(formData.get("reason")??""),p_applicant_note:String(formData.get("applicant_note")??"")});if(error)throw new Error(error.message);revalidatePath(`/admin/applications/${id}`);revalidatePath(`/applications/${id}`)}
