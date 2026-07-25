import {NextRequest,NextResponse} from "next/server";
import {emailFrom,getResend} from "@/lib/email";
import {createAdminClient} from "@/lib/supabase/admin";

export async function GET(request:NextRequest){
  if(!process.env.CRON_SECRET||request.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:"Unauthorized"},{status:401});
  const admin=createAdminClient();const now=new Date().toISOString();
  const {data:cases,error}=await admin.from("student_help_cases")
    .select("id,case_code,student_name,preferred_name,email,school_name,issue_type,status,follow_up_count,essentials_requested,essentials_term,essentials_status")
    .not("verified_at","is",null).lte("next_follow_up_at",now).in("status",["new","reviewing","waiting_on_student","referred_to_school","follow_up_due"]).order("next_follow_up_at").limit(40);
  if(error)return NextResponse.json({error:"Follow-up queue unavailable"},{status:500});
  let sent=0;
  for(const record of cases??[]){
    const studentName=record.preferred_name||record.student_name;
    const result=await getResend().emails.send({from:emailFrom,to:record.email,replyTo:"nationals@estherfundsinc.org",subject:`EFF follow-up for case ${record.case_code}`,text:`Hello ${studentName},

This is a follow-up for your EFF Student Help Desk case.

Case: ${record.case_code}
School: ${record.school_name}
Topic: ${record.issue_type}

Please reply with your case number in the subject and tell us:
1. What changed since your last update?
2. Which school office responded?
3. What deadline or promised follow-up date applies now?
4. Is the issue resolved?

${record.essentials_requested?`Your ${record.essentials_term} Student Essentials request status is: ${String(record.essentials_status).replaceAll("_"," ")}. Assistance is limited to $100 per approved student for the selected term and is not guaranteed.`:""}

Do not send passwords, Social Security numbers, tax returns, bank details, or unredacted IDs by email.

Esther Funds Foundation`});
    if(result.error)continue;
    const followUpCount=(record.follow_up_count??0)+1;
    const next=new Date(Date.now()+(followUpCount<2?4:7)*24*60*60*1000).toISOString();
    await admin.from("student_help_cases").update({status:"follow_up_due",last_follow_up_at:now,next_follow_up_at:next,follow_up_count:followUpCount,updated_at:now}).eq("id",record.id);
    await admin.from("student_help_case_events").insert({case_id:record.id,event_type:"automatic_follow_up",summary:`Automatic follow-up ${followUpCount} sent to student.`});
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
