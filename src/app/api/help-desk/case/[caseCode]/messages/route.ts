import {NextRequest, NextResponse} from "next/server";
import {z} from "zod";
import {createAdminClient} from "@/lib/supabase/admin";
import {verifyHelpDeskToken} from "@/lib/help-desk/tokens";
import {classifyHelpDeskMessage, CONDUCT_RESPONSE, PRIVACY_RESPONSE, SAFETY_RESPONSE} from "@/lib/help-desk/safety";
import {matchHelpDeskResources} from "@/lib/help-desk/resources";
import {sendLeadershipAlert, sendVolunteerQueueNotification} from "@/lib/help-desk/email";

export const dynamic = "force-dynamic";
const bodySchema = z.object({body:z.string().trim().min(2).max(6000)});

async function authorize(request: NextRequest, caseCode: string) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const verified = verifyHelpDeskToken(token);
  if (!verified) return null;
  const admin = createAdminClient();
  const {data: conversation} = await admin.from("help_desk_conversations")
    .select("id,case_id,status,assigned_volunteer_id,access_token_hash,student_help_cases(case_code,email)")
    .eq("case_id",verified.caseId).eq("access_token_hash",verified.tokenHash).maybeSingle();
  const record = Array.isArray(conversation?.student_help_cases) ? conversation.student_help_cases[0] : conversation?.student_help_cases;
  if (!conversation || !record || record.case_code.toUpperCase()!==caseCode.toUpperCase()) return null;
  return {admin,conversation,record};
}

export async function GET(request:NextRequest,{params}:{params:Promise<{caseCode:string}>}) {
  const {caseCode}=await params;
  const context=await authorize(request,caseCode);
  if(!context)return NextResponse.json({error:"Secure case not found."},{status:403});
  const {data:messages}=await context.admin.from("help_desk_messages").select("id,sender_type,body,safety_flag,conduct_flag,created_at").eq("conversation_id",context.conversation.id).order("created_at",{ascending:true}).limit(500);
  return NextResponse.json({status:context.conversation.status,messages:messages??[]},{headers:{"Cache-Control":"private, no-store"}});
}

export async function POST(request:NextRequest,{params}:{params:Promise<{caseCode:string}>}) {
  const {caseCode}=await params;
  const context=await authorize(request,caseCode);
  if(!context)return NextResponse.json({error:"Secure case not found."},{status:403});
  if(["closed","safety_locked"].includes(context.conversation.status))return NextResponse.json({error:"This conversation is not open for ordinary messages."},{status:409});
  const parsed=bodySchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Write a message between 2 and 6,000 characters."},{status:400});
  const classification=classifyHelpDeskMessage(parsed.data.body);
  const resources=matchHelpDeskResources(parsed.data.body);
  const {data:message,error}=await context.admin.from("help_desk_messages").insert({
    conversation_id:context.conversation.id,sender_type:"student",body:parsed.data.body,
    suggested_resource_keys:resources.map(item=>item.key),safety_flag:classification.safety,conduct_flag:classification.conduct,
  }).select("id").single();
  if(error)return NextResponse.json({error:"Your message could not be saved."},{status:500});
  const now=new Date().toISOString();
  const nextStatus=classification.safety?"safety_locked":classification.conduct?"escalated":context.conversation.assigned_volunteer_id?"active":"unassigned";
  await Promise.all([
    context.admin.from("help_desk_conversations").update({status:nextStatus,risk_level:classification.level,conduct_flag:classification.conduct,last_message_at:now,updated_at:now}).eq("id",context.conversation.id),
    context.admin.from("student_help_cases").update({last_student_message_at:now,updated_at:now}).eq("id",context.conversation.case_id),
  ]);

  const systemMessages:string[]=[];
  if(classification.safety)systemMessages.push(SAFETY_RESPONSE);
  else if(classification.conduct)systemMessages.push(CONDUCT_RESPONSE);
  if(classification.privacy)systemMessages.push(PRIVACY_RESPONSE);
  for(const text of systemMessages){
    await context.admin.from("help_desk_messages").insert({conversation_id:context.conversation.id,sender_type:"system",body:text,safety_flag:classification.safety,conduct_flag:classification.conduct});
  }
  if(classification.safety||classification.conduct||classification.privacy){
    const escalationType=classification.safety?"safety":classification.conduct?"conduct":"privacy";
    const summary=classification.reasons.join(", ");
    const {data:escalation}=await context.admin.from("help_desk_escalations").insert({
      conversation_id:context.conversation.id,message_id:message.id,escalation_type:escalationType,severity:classification.safety?"immediate":"urgent",summary,
    }).select("id").single();
    try{
      await sendLeadershipAlert(context.record.case_code,summary);
      if(escalation)await context.admin.from("help_desk_escalations").update({email_alert_sent_at:new Date().toISOString()}).eq("id",escalation.id);
    }catch(error){console.error("Leadership Help Desk alert failed",error);}
  }else if(context.conversation.assigned_volunteer_id){
    const {data:profile}=await context.admin.from("help_desk_volunteer_profiles").select("notification_email,email_notifications").eq("user_id",context.conversation.assigned_volunteer_id).maybeSingle();
    if(profile?.email_notifications)try{await sendVolunteerQueueNotification(profile.notification_email);}catch(error){console.error("Assigned volunteer notification failed",error);}
  }else{
    const threshold=new Date(Date.now()-15*60_000).toISOString();
    const {data:volunteers}=await context.admin.from("help_desk_volunteer_profiles").select("user_id,notification_email,last_notified_at").eq("status","certified").eq("email_notifications",true).or(`last_notified_at.is.null,last_notified_at.lt.${threshold}`).limit(50);
    for(const volunteer of volunteers??[]){
      try{await sendVolunteerQueueNotification(volunteer.notification_email);await context.admin.from("help_desk_volunteer_profiles").update({last_notified_at:now}).eq("user_id",volunteer.user_id);}catch(error){console.error("Volunteer queue notification failed",error);}
    }
  }
  return NextResponse.json({ok:true,status:nextStatus});
}
