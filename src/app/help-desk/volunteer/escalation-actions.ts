"use server";

import {revalidatePath} from "next/cache";
import {z} from "zod";
import {requireHelpDeskVolunteer} from "@/lib/help-desk/auth";
import {sendLeadershipAlert} from "@/lib/help-desk/email";

const schema=z.object({
  conversationId:z.string().uuid(),
  escalationType:z.enum(["safety","conduct","privacy","legal_or_policy","funding_decision","media","volunteer_support","other"]),
  summary:z.string().trim().min(10).max(1500),
});

export async function escalateHelpDeskConversation(formData:FormData){
  const {user,admin}=await requireHelpDeskVolunteer();
  const parsed=schema.parse({
    conversationId:formData.get("conversationId"),
    escalationType:formData.get("escalationType"),
    summary:formData.get("summary"),
  });
  const {data:conversation}=await admin.from("help_desk_conversations").select("id,case_id,student_help_cases(case_code)").eq("id",parsed.conversationId).eq("assigned_volunteer_id",user.id).maybeSingle();
  const record=Array.isArray(conversation?.student_help_cases)?conversation.student_help_cases[0]:conversation?.student_help_cases;
  if(!conversation||!record)throw new Error("This case is not assigned to you.");
  const safety=parsed.escalationType==="safety";
  const {data:escalation}=await admin.from("help_desk_escalations").insert({
    conversation_id:conversation.id,escalation_type:parsed.escalationType,severity:safety?"immediate":"urgent",summary:parsed.summary,created_by:user.id,
  }).select("id").single();
  await admin.from("help_desk_conversations").update({status:safety?"safety_locked":"escalated",risk_level:safety?"safety":"urgent",updated_at:new Date().toISOString()}).eq("id",conversation.id);
  await admin.from("help_desk_messages").insert({conversation_id:conversation.id,sender_type:"system",body:safety?"A trained volunteer placed this conversation in a safety hold and alerted EFF leadership. For immediate danger call 911; for suicide, self-harm, or mental-health crisis support call or text 988.":"A trained volunteer escalated this conversation to the EFF National Office for authorized review."});
  try{await sendLeadershipAlert(record.case_code,`${parsed.escalationType.replaceAll("_"," ")}: ${parsed.summary}`);if(escalation)await admin.from("help_desk_escalations").update({email_alert_sent_at:new Date().toISOString()}).eq("id",escalation.id);}catch(error){console.error("Manual escalation alert failed",error);}
  revalidatePath("/help-desk/volunteer/desk");
}
