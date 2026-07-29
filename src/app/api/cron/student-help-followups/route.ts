import {NextRequest,NextResponse} from "next/server";
import {emailFrom,getResend} from "@/lib/email";
import {createAdminClient} from "@/lib/supabase/admin";
import {createHelpDeskToken,hashHelpDeskToken} from "@/lib/help-desk/tokens";
import {sendSecureCaseNotification} from "@/lib/help-desk/email";

export async function GET(request:NextRequest){
  if(!process.env.CRON_SECRET||request.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:"Unauthorized"},{status:401});
  const admin=createAdminClient();const now=new Date().toISOString();
  const {data:cases,error}=await admin.from("student_help_cases")
    .select("id,case_code,student_name,preferred_name,email,school_name,issue_type,status,follow_up_count,essentials_requested,essentials_term,essentials_status")
    .not("verified_at","is",null).lte("next_follow_up_at",now).in("status",["new","reviewing","waiting_on_student","referred_to_school","follow_up_due"]).order("next_follow_up_at").limit(40);
  if(error)return NextResponse.json({error:"Follow-up queue unavailable"},{status:500});
  let sent=0;
  for(const record of cases??[]){
    const token=createHelpDeskToken(record.id);
    const {data:conversation}=await admin.from("help_desk_conversations").upsert({
      case_id:record.id,access_token_hash:hashHelpDeskToken(token),status:"unassigned",updated_at:now
    },{onConflict:"case_id"}).select("id,status").single();
    if(!conversation)continue;
    const followUpCount=(record.follow_up_count??0)+1;
    const essentials=record.essentials_requested?`\n\nYour ${record.essentials_term} Student Essentials request status is ${String(record.essentials_status).replaceAll("_"," ")}. Assistance is limited, separately reviewed, and not guaranteed.`:"";
    await admin.from("help_desk_messages").insert({
      conversation_id:conversation.id,sender_type:"system",
      body:`EFF follow-up ${followUpCount}: please reply securely with (1) what changed, (2) which school office responded, (3) the current deadline or promised response date, and (4) whether the issue is resolved.${essentials}`
    });
    try{await sendSecureCaseNotification(record.email,record.case_code,token,`Secure EFF follow-up — ${record.case_code}`);}catch(error){console.error("Secure student follow-up failed",error);continue;}
    const next=new Date(Date.now()+(followUpCount<2?4:7)*24*60*60*1000).toISOString();
    await admin.from("student_help_cases").update({status:"follow_up_due",secure_access_issued_at:now,last_follow_up_at:now,next_follow_up_at:next,follow_up_count:followUpCount,updated_at:now}).eq("id",record.id);
    await admin.from("student_help_case_events").insert({case_id:record.id,event_type:"automatic_secure_follow_up",summary:`Automatic follow-up ${followUpCount} posted in the secure Help Desk; notification email sent without case details.`});
    sent++;
  }
  const {data:schoolCases}=await admin.from("student_help_cases")
    .select("id,case_code,student_name,email,school_name,department_email,outreach_subject,school_follow_up_count")
    .not("outreach_sent_at","is",null).is("school_response_at",null).lte("next_school_follow_up_at",now).lt("school_follow_up_count",2).limit(25);
  let schoolFollowUps=0;
  for(const record of schoolCases??[]){
    if(!record.department_email)continue;
    const count=(record.school_follow_up_count??0)+1;
    const result=await getResend().emails.send({from:emailFrom,to:record.department_email,cc:[record.email,"nationals@estherfundsinc.org"],replyTo:record.email,subject:`Follow-up ${count}: ${record.outreach_subject||`Student support request — ${record.student_name}`}`,text:`Hello,

Esther Funds Foundation is following up, with the student copied, on authorized student-support request ${record.case_code} for ${record.student_name} at ${record.school_name}.

Please reply directly to the student and copy EFF with the school case number, responsible office, remaining action, secure document instructions if applicable, and expected written-response date.

If this is not the correct office, please identify or forward the request to the office that owns the next decision.

Please do not send protected education, medical, financial, or identity records to EFF by ordinary email.

Thank you,
Esther Funds Foundation`});
    if(result.error)continue;
    await admin.from("student_help_cases").update({school_follow_up_count:count,next_school_follow_up_at:count>=2?null:new Date(Date.now()+7*24*60*60*1000).toISOString(),updated_at:now}).eq("id",record.id);
    await admin.from("student_help_case_events").insert({case_id:record.id,event_type:"school_follow_up_sent",summary:`Automatic school follow-up ${count} sent with student copied.`});
    schoolFollowUps++;
  }
  return NextResponse.json({processed:cases?.length??0,studentFollowUps:sent,schoolFollowUps});
}
