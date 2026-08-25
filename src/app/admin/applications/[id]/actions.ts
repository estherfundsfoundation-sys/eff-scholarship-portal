"use server";

import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireAdmin} from "@/lib/auth/staff";
import {createAdminClient} from "@/lib/supabase/admin";

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

const quickMessages:Record<string,{subject:string;message:string}>={
  received:{subject:"We received your EFF application",message:"We received your application successfully. It is safely in our system, and you can use your secure portal to review its current status."},
  reviewing:{subject:"Your EFF application is still under review",message:"Your application remains under review. Our team is carefully reviewing submitted information, and no additional action is required from you right now unless we contact you through the portal."},
  more_time:{subject:"An update about your EFF application review",message:"Your application is still in our review process. Due to application volume, the review is taking additional time. Submission does not guarantee funding or an award, and we will post the official decision in your secure portal when review is complete."},
  portal:{subject:"Please check your secure EFF portal",message:"There is an update connected to your application. Please sign in to your secure Esther Funds Foundation Portal to review the application record and any available next steps."},
};

export async function sendApplicationEmail(formData:FormData){
  const {user}=await requireAdmin();
  const admin=createAdminClient();
  const id=String(formData.get("application_id")??"");
  const preset=String(formData.get("preset")??"");
  const configured=quickMessages[preset];
  const subject=(configured?.subject??String(formData.get("subject")??"")).trim();
  const message=(configured?.message??String(formData.get("message")??"")).trim();
  if(!id||!subject||!message)redirect(errorPath(id,"Enter both an email subject and message."));
  if(subject.length>160||message.length>4000)redirect(errorPath(id,"Keep the subject under 160 characters and the message under 4,000 characters."));

  const {data:application,error:applicationError}=await admin.from("applications").select("id,profiles!applications_applicant_id_fkey(legal_name,preferred_name,primary_email)").eq("id",id).single();
  if(applicationError||!application)redirect(errorPath(id,"The application could not be found."));
  const profile=application.profiles as unknown as {legal_name:string|null;preferred_name:string|null;primary_email:string|null};
  const recipient=String(profile?.primary_email??"").trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)||/(no-?reply|example\.(com|org)|test@)/i.test(recipient))redirect(errorPath(id,"This applicant does not have a deliverable email address."));
  const {data:suppression}=await admin.from("email_suppressions").select("email").eq("email",recipient).maybeSingle();
  if(suppression)redirect(errorPath(id,"Email delivery is suppressed for this applicant. Review the Communications page before retrying."));

  const tenMinuteWindow=Math.floor(Date.now()/600000);
  const messageType=preset||"custom";
  const idempotencyKey=`application-staff-message:${id}:${messageType}:${tenMinuteWindow}`;
  const {data:queued,error}=await admin.from("messages").upsert({application_id:id,recipient,idempotency_key:idempotencyKey,status:"queued",payload_private:{name:profile.preferred_name||profile.legal_name||"Applicant",status:subject,message,application_path:`/applications/${id}`},template_key:"application_staff_message",next_attempt_at:new Date().toISOString()},{onConflict:"idempotency_key",ignoreDuplicates:true}).select("id").maybeSingle();
  if(error)redirect(errorPath(id,"The email could not be added to the protected delivery queue."));
  await admin.from("audit_events").insert({actor_id:user.id,action:queued?"application_email_queued":"application_email_duplicate_prevented",target_type:"application",target_id:id,metadata_safe:{message_type:messageType,subject}});
  refresh(id);
  redirect(successPath(id,queued?"email_queued":"email_already_queued"));
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
