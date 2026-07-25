import {createHash} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {emailFrom,getResend} from "@/lib/email";
import {createAdminClient} from "@/lib/supabase/admin";

export async function GET(request:NextRequest){
  const token=request.nextUrl.searchParams.get("token");
  if(!token)return NextResponse.redirect(new URL("/resources/student-help?error=This verification link is invalid.",request.url));
  const admin=createAdminClient();const tokenHash=createHash("sha256").update(token).digest("hex");
  const {data:record}=await admin.from("student_help_cases").select("id,case_code,student_name,preferred_name,email,school_name,issue_type,essentials_requested,essentials_term,verified_at,verification_expires_at").eq("verification_token_hash",tokenHash).maybeSingle();
  if(!record)return NextResponse.redirect(new URL("/resources/student-help?error=This verification link is invalid or has already been replaced.",request.url));
  if(record.verified_at)return NextResponse.redirect(new URL(`/resources/student-help?case=verified&code=${record.case_code}`,request.url));
  if(!record.verification_expires_at||new Date(record.verification_expires_at)<new Date())return NextResponse.redirect(new URL("/resources/student-help?error=This verification link expired. Please open a new case.",request.url));
  const now=new Date();const next=new Date(now.getTime()+3*24*60*60*1000).toISOString();
  const updated=await admin.from("student_help_cases").update({verified_at:now.toISOString(),status:"new",next_follow_up_at:next,verification_token_hash:null,updated_at:now.toISOString()}).eq("id",record.id);
  if(updated.error)return NextResponse.redirect(new URL("/resources/student-help?error=We could not verify your case. Please contact EFF.",request.url));
  await admin.from("student_help_case_events").insert({case_id:record.id,event_type:"email_verified",summary:"Student verified their email; case entered the review queue."});
  try{
    await Promise.all([
      getResend().emails.send({from:emailFrom,to:record.email,replyTo:"nationals@estherfundsinc.org",subject:`Your EFF case ${record.case_code} is verified`,text:`Hello ${record.preferred_name||record.student_name},

Your EFF Student Help Desk case is verified and in review.

Case: ${record.case_code}
School: ${record.school_name}
Topic: ${record.issue_type}

EFF will use your case to identify the most likely office, documents to prepare, official resources, and next follow-up. Reply with your case number in the subject line if your deadline changes.

${record.essentials_requested?`Your ${record.essentials_term} Student Essentials request is also in review. The maximum is $100 per approved student for the selected term. Approval and funding are not guaranteed, and EFF will arrange the payment method after approval.`:""}

Never send passwords, Social Security numbers, tax returns, full bank details, or unredacted IDs by email.

Esther Funds Foundation`}),
      getResend().emails.send({from:emailFrom,to:"nationals@estherfundsinc.org",replyTo:record.email,subject:`New verified national help case ${record.case_code}`,text:`A student verified a national help case.\n\nCase: ${record.case_code}\nSchool: ${record.school_name}\nTopic: ${record.issue_type}\nFall Essentials: ${record.essentials_requested?"Requested":"No"}\n\nReview it in the secure EFF database. Do not request sensitive records by ordinary email.`})
    ]);
  }catch(error){console.error("National case confirmations failed",error);}
  return NextResponse.redirect(new URL(`/resources/student-help?case=verified&code=${record.case_code}#open-case`,request.url));
}
