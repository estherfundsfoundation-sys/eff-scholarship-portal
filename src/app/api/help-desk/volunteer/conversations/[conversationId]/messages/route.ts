import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {authenticateHelpDeskVolunteer} from "@/lib/help-desk/api-auth";
import {classifyHelpDeskMessage} from "@/lib/help-desk/safety";
import {matchHelpDeskResources} from "@/lib/help-desk/resources";
import {createHelpDeskToken} from "@/lib/help-desk/tokens";
import {sendLeadershipAlert,sendSecureCaseNotification} from "@/lib/help-desk/email";

export const dynamic="force-dynamic";
const bodySchema=z.object({body:z.string().trim().min(2).max(6000)});

async function context(conversationId:string){
  const auth=await authenticateHelpDeskVolunteer();
  if(!auth)return null;
  const {data:conversation}=await auth.admin.from("help_desk_conversations")
    .select("id,case_id,status,assigned_volunteer_id,student_help_cases(case_code,email)")
    .eq("id",conversationId).eq("assigned_volunteer_id",auth.user.id).maybeSingle();
  const record=Array.isArray(conversation?.student_help_cases)?conversation.student_help_cases[0]:conversation?.student_help_cases;
  if(!conversation||!record)return null;
  return {...auth,conversation,record};
}

export async function GET(_request:NextRequest,{params}:{params:Promise<{conversationId:string}>}){
  const {conversationId}=await params;const ctx=await context(conversationId);
  if(!ctx)return NextResponse.json({error:"Volunteer case access is unavailable."},{status:403});
  const {data:messages}=await ctx.admin.from("help_desk_messages").select("id,sender_type,body,safety_flag,conduct_flag,created_at").eq("conversation_id",conversationId).order("created_at",{ascending:true}).limit(500);
  const latestStudent=[...(messages??[])].reverse().find(item=>item.sender_type==="student");
  const suggestions=matchHelpDeskResources(latestStudent?.body||ctx.record.case_code).map(item=>({key:item.key,title:item.title,href:item.href,summary:item.summary,suggestedReply:item.suggestedReply}));
  return NextResponse.json({status:ctx.conversation.status,messages:messages??[],suggestions},{headers:{"Cache-Control":"private, no-store"}});
}

export async function POST(request:NextRequest,{params}:{params:Promise<{conversationId:string}>}){
  const {conversationId}=await params;const ctx=await context(conversationId);
  if(!ctx)return NextResponse.json({error:"Volunteer case access is unavailable."},{status:403});
  if(["closed","safety_locked"].includes(ctx.conversation.status))return NextResponse.json({error:"This conversation is not open for an ordinary volunteer reply."},{status:409});
  const parsed=bodySchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Write a message between 2 and 6,000 characters."},{status:400});
  const classification=classifyHelpDeskMessage(parsed.data.body);
  if(classification.safety||classification.conduct||classification.privacy){
    const summary=`Volunteer reply triggered ${classification.reasons.join(", ")}`;
    await ctx.admin.from("help_desk_escalations").insert({conversation_id:conversationId,escalation_type:classification.safety?"safety":classification.conduct?"conduct":"privacy",severity:"urgent",summary,created_by:ctx.user.id});
    try{await sendLeadershipAlert(ctx.record.case_code,summary);}catch(error){console.error("Volunteer reply escalation alert failed",error);}
    return NextResponse.json({error:"This reply may contain unsafe, inappropriate, or sensitive content. It was not sent and EFF leadership was alerted."},{status:422});
  }
  const resources=matchHelpDeskResources(parsed.data.body);
  const {error}=await ctx.admin.from("help_desk_messages").insert({
    conversation_id:conversationId,sender_type:"volunteer",sender_user_id:ctx.user.id,body:parsed.data.body,suggested_resource_keys:resources.map(item=>item.key),
  });
  if(error)return NextResponse.json({error:"The reply could not be saved."},{status:500});
  const now=new Date().toISOString();
  await Promise.all([
    ctx.admin.from("help_desk_conversations").update({status:"waiting_student",last_message_at:now,updated_at:now}).eq("id",conversationId),
    ctx.admin.from("student_help_cases").update({last_volunteer_message_at:now,status:"waiting_on_student",updated_at:now}).eq("id",ctx.conversation.case_id),
  ]);
  try{
    const token=createHelpDeskToken(ctx.conversation.case_id);
    await sendSecureCaseNotification(ctx.record.email,ctx.record.case_code,token,`A trained EFF volunteer replied — ${ctx.record.case_code}`);
  }catch(error){console.error("Student secure message notification failed",error);}
  return NextResponse.json({ok:true,status:"waiting_student"});
}
