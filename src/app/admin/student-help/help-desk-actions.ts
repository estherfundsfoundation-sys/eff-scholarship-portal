"use server";

import {revalidatePath} from "next/cache";
import {z} from "zod";
import {requireAdmin} from "@/lib/auth/staff";
import {createAdminClient} from "@/lib/supabase/admin";
import {classifyHelpDeskMessage} from "@/lib/help-desk/safety";
import {createHelpDeskToken,hashHelpDeskToken} from "@/lib/help-desk/tokens";
import {sendLeadershipAlert,sendSecureCaseNotification} from "@/lib/help-desk/email";

const idSchema=z.string().uuid();

export async function revokeHelpDeskVolunteer(formData:FormData){
  const {user}=await requireAdmin();const volunteerId=idSchema.parse(formData.get("volunteerId"));
  const reason=z.string().trim().min(10).max(1000).parse(formData.get("reason"));
  const admin=createAdminClient();const now=new Date().toISOString();
  await Promise.all([
    admin.from("help_desk_volunteer_profiles").update({status:"revoked",revoked_at:now,revoked_by:user.id,revoked_reason:reason,updated_at:now}).eq("user_id",volunteerId),
    admin.from("help_desk_shifts").update({status:"ended",ended_at:now}).eq("volunteer_id",volunteerId).eq("status","active"),
    admin.from("help_desk_service_logs").update({ended_at:now,closeout_summary:"Access revoked by EFF; service credit requires administrative review."}).eq("volunteer_id",volunteerId).is("ended_at",null),
    admin.from("help_desk_conversations").update({status:"unassigned",assigned_volunteer_id:null,assigned_at:null,updated_at:now}).eq("assigned_volunteer_id",volunteerId).in("status",["assigned","active","waiting_student"]),
  ]);
  await admin.from("audit_events").insert({actor_id:user.id,action:"help_desk_volunteer_revoked",target_type:"help_desk_volunteer",target_id:volunteerId,metadata_safe:{reason}});
  revalidatePath("/admin/student-help/volunteers");
}

export async function restoreHelpDeskVolunteer(formData:FormData){
  const {user}=await requireAdmin();const volunteerId=idSchema.parse(formData.get("volunteerId"));
  const admin=createAdminClient();const now=new Date().toISOString();
  await admin.from("help_desk_volunteer_profiles").update({status:"certified",revoked_at:null,revoked_by:null,revoked_reason:null,updated_at:now}).eq("user_id",volunteerId).eq("training_score",100);
  await admin.from("audit_events").insert({actor_id:user.id,action:"help_desk_volunteer_restored",target_type:"help_desk_volunteer",target_id:volunteerId,metadata_safe:{}});
  revalidatePath("/admin/student-help/volunteers");
}

export async function adminCloseHelpDeskConversation(formData:FormData){
  const {user}=await requireAdmin();const conversationId=idSchema.parse(formData.get("conversationId"));
  const reason=z.string().trim().min(10).max(1000).parse(formData.get("reason"));
  const admin=createAdminClient();const now=new Date().toISOString();
  await admin.from("help_desk_service_logs").update({ended_at:now,closeout_summary:"Conversation closed by EFF National Office; service credit requires administrative review."}).eq("conversation_id",conversationId).is("ended_at",null);
  await admin.from("help_desk_conversations").update({status:"closed",closed_at:now,closed_by:user.id,closed_reason:reason,updated_at:now}).eq("id",conversationId);
  await admin.from("help_desk_messages").insert({conversation_id:conversationId,sender_type:"system",sender_user_id:user.id,body:`EFF National Office closed this conversation. Reason and next step: ${reason}`});
  revalidatePath("/admin/student-help");
}

export async function adminReopenHelpDeskConversation(formData:FormData){
  const {user}=await requireAdmin();const conversationId=idSchema.parse(formData.get("conversationId"));
  const admin=createAdminClient();const now=new Date().toISOString();
  await admin.from("help_desk_conversations").update({status:"unassigned",closed_at:null,closed_by:null,closed_reason:null,assigned_volunteer_id:null,assigned_at:null,updated_at:now}).eq("id",conversationId);
  await admin.from("help_desk_messages").insert({conversation_id:conversationId,sender_type:"system",sender_user_id:user.id,body:"EFF National Office reopened this conversation for continued support."});
  revalidatePath("/admin/student-help");
}

export async function adminReleaseVolunteer(formData:FormData){
  await requireAdmin();const conversationId=idSchema.parse(formData.get("conversationId"));
  const admin=createAdminClient();const now=new Date().toISOString();
  await admin.from("help_desk_service_logs").update({ended_at:now,closeout_summary:"Case released by EFF National Office; service credit requires administrative review."}).eq("conversation_id",conversationId).is("ended_at",null);
  await admin.from("help_desk_conversations").update({status:"unassigned",assigned_volunteer_id:null,assigned_at:null,updated_at:now}).eq("id",conversationId);
  revalidatePath("/admin/student-help");
}

export async function sendAdminHelpDeskMessage(formData:FormData){
  const {user}=await requireAdmin();const conversationId=idSchema.parse(formData.get("conversationId"));
  const body=z.string().trim().min(2).max(6000).parse(formData.get("body"));
  const admin=createAdminClient();const classification=classifyHelpDeskMessage(body);
  if(classification.safety||classification.conduct||classification.privacy)throw new Error("The message contains language or sensitive data that requires review before sending.");
  const {data:conversation}=await admin.from("help_desk_conversations").select("id,case_id,student_help_cases(case_code,email)").eq("id",conversationId).maybeSingle();
  const record=Array.isArray(conversation?.student_help_cases)?conversation.student_help_cases[0]:conversation?.student_help_cases;
  if(!conversation||!record)throw new Error("Conversation not found.");
  const now=new Date().toISOString();
  await admin.from("help_desk_messages").insert({conversation_id:conversationId,sender_type:"admin",sender_user_id:user.id,body});
  await admin.from("help_desk_conversations").update({status:"waiting_student",last_message_at:now,updated_at:now}).eq("id",conversationId);
  try{await sendSecureCaseNotification(record.email,record.case_code,createHelpDeskToken(conversation.case_id),`EFF National Office replied â€” ${record.case_code}`);}catch(error){console.error("Admin student notification failed",error);}
  revalidatePath(`/admin/student-help/${record.case_code}`);
}

export async function issueSecureHelpDeskAccess(formData:FormData){
  await requireAdmin();const caseId=idSchema.parse(formData.get("caseId"));
  const admin=createAdminClient();const {data:record}=await admin.from("student_help_cases").select("id,case_code,email,verified_at").eq("id",caseId).maybeSingle();
  if(!record?.verified_at)throw new Error("Only a verified case can receive secure access.");
  const token=createHelpDeskToken(record.id);const now=new Date().toISOString();
  const {data:conversation}=await admin.from("help_desk_conversations").upsert({case_id:record.id,access_token_hash:hashHelpDeskToken(token),status:"unassigned",last_message_at:now,updated_at:now},{onConflict:"case_id"}).select("id").single();
  if(!conversation)throw new Error("Secure conversation could not be created.");
  const {count}=await admin.from("help_desk_messages").select("id",{count:"exact",head:true}).eq("conversation_id",conversation.id);
  if(!count)await admin.from("help_desk_messages").insert({conversation_id:conversation.id,sender_type:"system",body:"EFF opened this secure National Help Desk conversation. A trained volunteer may reply when available. Email notifications will not include private case details."});
  await admin.from("student_help_cases").update({secure_access_issued_at:now,updated_at:now}).eq("id",record.id);
  try{await sendSecureCaseNotification(record.email,record.case_code,token,`Your secure EFF Help Desk case is ready â€” ${record.case_code}`);}catch(error){console.error("Secure access email failed",error);}
  revalidatePath("/admin/student-help");
}

export async function resolveHelpDeskEscalation(formData:FormData){
  const {user}=await requireAdmin();const escalationId=idSchema.parse(formData.get("escalationId"));
  const admin=createAdminClient();await admin.from("help_desk_escalations").update({status:"resolved",resolved_at:new Date().toISOString(),resolved_by:user.id}).eq("id",escalationId);
  revalidatePath("/admin/student-help");
}

export async function testLeadershipEscalation(formData:FormData){
  await requireAdmin();const caseCode=z.string().trim().min(4).max(40).parse(formData.get("caseCode"));
  await sendLeadershipAlert(caseCode,"Test alert requested from the protected EFF admin console.");
}
