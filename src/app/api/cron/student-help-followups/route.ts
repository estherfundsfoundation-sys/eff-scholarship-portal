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
  return NextResponse.json({processed:cases?.length??0,sent});
}
