"use server";

import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireAdmin} from "@/lib/auth/staff";

const errorPath=(id:string,message:string)=>`/admin/applications/${encodeURIComponent(id)}?action_error=${encodeURIComponent(message)}`;
const successPath=(id:string,action:string)=>`/admin/applications/${encodeURIComponent(id)}?action_done=${encodeURIComponent(action)}`;

const refresh=(id:string)=>{
  revalidatePath(`/admin/applications/${id}`);
  revalidatePath(`/applications/${id}`);
  revalidatePath("/admin/applications");
  revalidatePath("/admin/reviews");
};

export async function transitionApplication(formData:FormData){
  const {supabase}=await requireAdmin();
  const id=String(formData.get("application_id")??"");
  const status=String(formData.get("new_status")??"");
  const reason=String(formData.get("reason")??"").trim();
  const applicantNote=String(formData.get("applicant_note")??"").trim();
  const confirmation=String(formData.get("confirmation")??"").trim().toUpperCase();

  if(!reason)redirect(errorPath(id,"Enter the private reason for this action."));
  if(status==="approved"&&confirmation!=="APPROVE")redirect(errorPath(id,"Type APPROVE to confirm this approval."));
  if(status==="denied"&&confirmation!=="DENY")redirect(errorPath(id,"Type DENY to confirm this denial."));
  if(status==="denied"&&!applicantNote)redirect(errorPath(id,"Add a compassionate explanation for the student before denying this application."));

  const publicNote=status==="approved"
    ? applicantNote||"Your application has been approved. Your secure acceptance letter and any next steps are available in the portal. Approval does not by itself confirm a payment amount; award details are issued separately."
    : applicantNote||null;
  const {error}=await supabase.rpc("staff_transition_application",{
    p_application_id:id,
    p_new_status:status,
    p_reason:reason,
    p_applicant_note:publicNote,
  });
  if(error)redirect(errorPath(id,error.message));
  refresh(id);
  redirect(successPath(id,status));
}

export async function addInternalNote(formData:FormData){
  const {supabase,user}=await requireAdmin();
  const id=String(formData.get("application_id")??"");
  const body=String(formData.get("body")??"").trim();
  if(!body)redirect(errorPath(id,"Enter a private note."));
  const {error}=await supabase.from("internal_notes").insert({application_id:id,author_id:user.id,body});
  if(error)redirect(errorPath(id,"The private note could not be saved."));
  refresh(id);
  redirect(successPath(id,"note"));
}

export async function requestInformation(formData:FormData){
  const {supabase}=await requireAdmin();
  const id=String(formData.get("application_id")??"");
  const item=String(formData.get("item")??"").trim();
  const dueAt=String(formData.get("due_at")??"").trim()||null;
  if(!item)redirect(errorPath(id,"Describe exactly what the student needs to correct or upload."));
  const {error}=await supabase.rpc("staff_request_application_correction",{
    p_application_id:id,
    p_item:item,
    p_due_at:dueAt,
  });
  if(error)redirect(errorPath(id,error.message));
  refresh(id);
  redirect(successPath(id,"correction"));
}

export async function recordAward(formData:FormData){
  const {supabase,user}=await requireAdmin();
  const id=String(formData.get("application_id")??"");
  const amount=Number(formData.get("amount"));
  if(!Number.isFinite(amount)||amount<=0)redirect(errorPath(id,"Enter a valid award amount."));
  const {data:application}=await supabase.from("applications").select("status").eq("id",id).single();
  if(application?.status!=="approved")redirect(errorPath(id,"Approve the application before issuing an award."));
  const award={application_id:id,amount,conditions:String(formData.get("conditions")??"").trim()||null,acceptance_deadline:String(formData.get("acceptance_deadline")??"")||null,disbursement_status:"pending_acceptance",scheduled_date:String(formData.get("scheduled_date")??"")||null};
  const {error}=await supabase.from("awards").upsert(award,{onConflict:"application_id"});
  if(error)redirect(errorPath(id,"The award could not be saved."));
  await supabase.from("audit_events").insert({actor_id:user.id,action:"award_recorded",target_type:"application",target_id:id,metadata_safe:{amount,acceptance_deadline:award.acceptance_deadline}});
  refresh(id);
  redirect(successPath(id,"award"));
}

export async function assignReviewer(formData:FormData){
  const {supabase}=await requireAdmin();
  const id=String(formData.get("application_id")??"");
  const reviewerId=String(formData.get("reviewer_id")??"");
  const {error}=await supabase.rpc("assign_application_reviewer",{p_application_id:id,p_reviewer_id:reviewerId});
  if(error)redirect(errorPath(id,error.message));
  refresh(id);
  redirect(successPath(id,"reviewer"));
}

export async function correctStatus(formData:FormData){
  const {supabase}=await requireAdmin();
  const id=String(formData.get("application_id")??"");
  const {error}=await supabase.rpc("correct_application_status",{p_application_id:id,p_new_status:String(formData.get("new_status")),p_reason:String(formData.get("reason")??""),p_applicant_note:String(formData.get("applicant_note")??"")});
  if(error)redirect(errorPath(id,error.message));
  refresh(id);
  redirect(successPath(id,"correction_recorded"));
}
