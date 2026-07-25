import {createHash} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {emailFrom,getResend} from "@/lib/email";
import {createAdminClient} from "@/lib/supabase/admin";
import {buildAutomaticStudentRouting,contactKeysForIssue,type SchoolContact} from "@/lib/student-help-routing";

export async function GET(request:NextRequest){
  const token=request.nextUrl.searchParams.get("token");
  if(!token)return NextResponse.redirect(new URL("/resources/student-help?error=This verification link is invalid.",request.url));
  const admin=createAdminClient();const tokenHash=createHash("sha256").update(token).digest("hex");
  const {data:record}=await admin.from("student_help_cases").select("id,case_code,student_name,preferred_name,email,college_unitid,school_name,issue_type,urgency,school_deadline,essentials_requested,essentials_term,verified_at,verification_expires_at").eq("verification_token_hash",tokenHash).maybeSingle();
  if(!record)return NextResponse.redirect(new URL("/resources/student-help?error=This verification link is invalid or has already been replaced.",request.url));
  if(record.verified_at)return NextResponse.redirect(new URL(`/resources/student-help?case=verified&code=${record.case_code}`,request.url));
  if(!record.verification_expires_at||new Date(record.verification_expires_at)<new Date())return NextResponse.redirect(new URL("/resources/student-help?error=This verification link expired. Please open a new case.",request.url));
  const now=new Date();const next=new Date(now.getTime()+3*24*60*60*1000).toISOString();
  const needsEffReview=Boolean(record.essentials_requested)||record.urgency==="Immediate â€” within 72 hours"||!record.college_unitid;
  const updated=await admin.from("student_help_cases").update({verified_at:now.toISOString(),status:needsEffReview?"new":"referred_to_school",next_follow_up_at:next,verification_token_hash:null,updated_at:now.toISOString()}).eq("id",record.id);
  if(updated.error)return NextResponse.redirect(new URL("/resources/student-help?error=We could not verify your case. Please contact EFF.",request.url));
  const [{data:school},{data:contactRows}]=await Promise.all([
    record.college_unitid?admin.from("college_directory").select("website,admissions_url,financial_aid_url,accessibility_url,veterans_url").eq("unitid",record.college_unitid).maybeSingle():Promise.resolve({data:null}),
    record.college_unitid?admin.from("college_contact_directory").select("department_key,department_name,contact_url,email,phone,source_url").eq("unitid",record.college_unitid).in("department_key",contactKeysForIssue(record.issue_type)).in("verification_status",["source_listed","verified"]):Promise.resolve({data:[]})
  ]);
  const routing=buildAutomaticStudentRouting(record,(contactRows??[]) as SchoolContact[],school??{});
  await admin.from("student_help_case_events").insert({case_id:record.id,event_type:"email_verified",summary:needsEffReview?"Student verified; automatic school routing sent and the exception entered EFF review.":"Student verified; automatic school routing sent without adding a routine case to the CEO review queue."});
  try{
    const sends=[
      getResend().emails.send({from:emailFrom,to:record.email,replyTo:"nationals@estherfundsinc.org",subject:`Your EFF case ${record.case_code} is verified`,text:`Hello ${record.preferred_name||record.student_name},

Your EFF Student Help Desk case is verified. You do not need to wait for a manual review to begin taking action.

${routing}

EFF will automatically follow up to ask what changed. Reply with your case number in the subject if your deadline changes or an official school channel is incorrect.

Esther Funds Foundation`}),
    ];
    if(needsEffReview)sends.push(getResend().emails.send({from:emailFrom,to:"nationals@estherfundsinc.org",replyTo:record.email,subject:"URGENT REVIEW CEO",text:`A verified National Student Help Desk exception requires review.\n\nCase: ${record.case_code}\nSchool: ${record.school_name}\nTopic: ${record.issue_type}\nStudent Essentials: ${record.essentials_requested?"Requested":"No"}\nImmediate deadline: ${record.urgency==="Immediate â€” within 72 hours"?"Yes":"No"}\nOfficial school match: ${record.college_unitid?"Yes":"No"}\n\nThe student already received automatic school routing. Review only the exception or funding decision in the secure admin area:\nhttps://portal.estherfundsfoundation.org/admin/student-help\n\nDo not request sensitive records by ordinary email.`}));
    await Promise.all(sends);
  }catch(error){console.error("National case confirmations failed",error);}
  return NextResponse.redirect(new URL(`/resources/student-help?case=verified&code=${record.case_code}#open-case`,request.url));
}
