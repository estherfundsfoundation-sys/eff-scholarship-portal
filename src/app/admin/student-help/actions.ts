"use server";
import {revalidatePath} from "next/cache";
import {z} from "zod";
import {requireAdmin} from "@/lib/auth/staff";
import {emailFrom,getResend} from "@/lib/email";
import {createAdminClient} from "@/lib/supabase/admin";

const sendSchema=z.object({caseId:z.string().uuid(),departmentEmail:z.string().trim().email().max(180),sourceUrl:z.string().trim().url().max(500),subject:z.string().trim().min(10).max(220),body:z.string().trim().min(100).max(8000)});
export async function sendSchoolOutreach(formData:FormData){
  const {user}=await requireAdmin();const parsed=sendSchema.safeParse({caseId:String(formData.get("caseId")??""),departmentEmail:String(formData.get("departmentEmail")??""),sourceUrl:String(formData.get("sourceUrl")??""),subject:String(formData.get("subject")??""),body:String(formData.get("body")??"")});
  if(!parsed.success)throw new Error("Provide a verified official department email, its public source page, and a complete message.");
  const admin=createAdminClient();const {data:record}=await admin.from("student_help_cases").select("id,case_code,email,student_name,authorize_eff_contact,verified_at,outreach_sent_at").eq("id",parsed.data.caseId).maybeSingle();
  if(!record?.verified_at||!record.authorize_eff_contact||record.outreach_sent_at)throw new Error("This case is not eligible for first outreach.");
  const sent=await getResend().emails.send({from:emailFrom,to:parsed.data.departmentEmail,cc:[record.email,"nationals@estherfundsinc.org"],replyTo:record.email,subject:parsed.data.subject,text:parsed.data.body});
  if(sent.error)throw new Error("The school outreach email was not accepted for delivery.");
  const now=new Date();await admin.from("student_help_cases").update({department_email:parsed.data.departmentEmail,department_email_source:parsed.data.sourceUrl,department_email_verified_at:now.toISOString(),outreach_subject:parsed.data.subject,outreach_body:parsed.data.body,outreach_approved_by:user.id,outreach_sent_at:now.toISOString(),outreach_provider_id:sent.data?.id,status:"referred_to_school",next_school_follow_up_at:new Date(now.getTime()+5*24*60*60*1000).toISOString(),updated_at:now.toISOString()}).eq("id",record.id);
  await admin.from("student_help_case_events").insert({case_id:record.id,event_type:"school_outreach_sent",summary:`EFF sent the approved first outreach to ${parsed.data.departmentEmail}; student copied.`});
  await admin.from("audit_events").insert({actor_id:user.id,action:"student_help_school_outreach_sent",target_type:"student_help_case",target_id:record.id,metadata_safe:{case_code:record.case_code}});
  revalidatePath("/admin/student-help");
}

export async function markSchoolResponse(formData:FormData){
  const {user}=await requireAdmin();const caseId=String(formData.get("caseId")??"");if(!z.string().uuid().safeParse(caseId).success)throw new Error("Invalid case.");
  const admin=createAdminClient();await admin.from("student_help_cases").update({school_response_at:new Date().toISOString(),next_school_follow_up_at:null,status:"reviewing",updated_at:new Date().toISOString()}).eq("id",caseId);
  await admin.from("student_help_case_events").insert({case_id:caseId,event_type:"school_response_recorded",summary:"EFF recorded that the school responded; automated school follow-ups stopped."});
  await admin.from("audit_events").insert({actor_id:user.id,action:"student_help_school_response_recorded",target_type:"student_help_case",target_id:caseId,metadata_safe:{}});
  revalidatePath("/admin/student-help");
}
