import {createHash} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {emailFrom,getResend} from "@/lib/email";
import {createAdminClient} from "@/lib/supabase/admin";

const hash=(token:string)=>createHash("sha256").update(token).digest("hex");
const amount=(value:number|null)=>value===null?"Not provided":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(value);
const recipients=(record:{student_type:string;issue_type:string;enrollment_status:string})=>{
  const to=new Set<string>(["studentsupport@howard.edu"]);
  if(record.student_type==="Graduate or professional student")to.add("hugsadmission@howard.edu");
  else if(record.student_type==="Incoming transfer")to.add("transfer@howard.edu");
  else if(record.student_type.startsWith("Incoming"))to.add("admission@howard.edu");
  else to.add("registrar@howard.edu");
  if(/aid|scholarship|waiver|discount/i.test(record.issue_type))to.add("finaid@howard.edu");
  if(/balance|payment/i.test(record.issue_type))to.add("bursarhelp@howard.edu");
  if(/housing/i.test(`${record.issue_type} ${record.enrollment_status}`))to.add("hureslife@howard.edu");
  return [...to];
};

export async function GET(request:NextRequest){
  const token=request.nextUrl.searchParams.get("token")||"";const destination=new URL("/resources/howard-help",request.url);
  if(!/^[a-f0-9]{64}$/.test(token)){destination.searchParams.set("error","That verification link is invalid.");destination.hash="case-intake";return NextResponse.redirect(destination);}
  const admin=createAdminClient();const {data:record}=await admin.from("howard_help_cases").select("*").eq("verification_token_hash",hash(token)).maybeSingle();
  if(!record){destination.searchParams.set("error","That verification link is invalid or no longer available.");destination.hash="case-intake";return NextResponse.redirect(destination);}
  if(record.advocacy_email_sent_at){destination.searchParams.set("case","verified");destination.searchParams.set("code",record.case_code);destination.hash="case-intake";return NextResponse.redirect(destination);}
  if(!record.verification_expires_at||new Date(record.verification_expires_at).getTime()<Date.now()){destination.searchParams.set("error","That verification link expired. Contact EFF with your case number for help.");destination.searchParams.set("code",record.case_code);destination.hash="case-intake";return NextResponse.redirect(destination);}
  const now=new Date().toISOString();const claimed=await admin.from("howard_help_cases").update({status:"sending",verified_at:now,verification_token_hash:null,updated_at:now}).eq("id",record.id).eq("status","pending_verification").select("id").maybeSingle();
  if(!claimed.data){destination.searchParams.set("case","pending");destination.searchParams.set("code",record.case_code);destination.hash="case-intake";return NextResponse.redirect(destination);}
  const studentFirst=record.preferred_name||record.student_name;
  const advocacy=`Howard University Enrollment Management and Student Support Team,

Esther Funds Foundation is submitting this urgent request with the student’s verified consent. The student is copied so Howard may communicate directly and complete any institution-required identity or FERPA steps.

Student: ${record.student_name}
Student email: ${record.email}
EFF case: ${record.case_code}
Student type: ${record.student_type}
Reported status: ${record.enrollment_status}
Primary issue: ${record.issue_type}
Balance previously shown: ${amount(record.balance_before)}
Balance currently shown: ${amount(record.balance_now)}
Deadline communicated to the student: ${record.school_deadline||"Not provided"}

Pending aid, scholarship, waiver, or payment information:
${record.aid_summary}

Student’s factual timeline:
${record.timeline}

Steps already taken:
${record.steps_taken}

REQUESTED RELIEF
EFF respectfully requests complete reinstatement of this student’s Fall 2026 admission and enrollment; restoration of the original course schedule and housing assignment, or equivalent placements; preservation of all accepted and pending aid; and an immediate itemized reconciliation of the student’s account. Please pause reassignment of the student’s seat, courses, and housing while the review is pending.

Please reply all with a case number, the name of the staff member responsible for the review, any remaining action required from the student, and the written reinstatement decision and deadline.

The student authorized EFF to transmit these facts and this request. Howard may require its own FERPA or identity-verification process before disclosing protected records. EFF is providing nonprofit educational advocacy and is not acting as legal counsel or making an eligibility determination.

With urgency and respect,

Esther Funds Foundation
Every Future Fulfilled
nationals@estherfundsinc.org
https://portal.estherfundsfoundation.org/resources/howard-help`;
  try{
    const resend=getResend();const sent=await resend.emails.send({from:emailFrom,to:recipients(record),cc:[record.email,"nationals@estherfundsinc.org"],replyTo:"nationals@estherfundsinc.org",subject:`Urgent reinstatement request – ${record.student_name} – ${record.case_code}`,text:advocacy});
    if(sent.error)throw new Error(sent.error.message);
    await Promise.all([
      admin.from("howard_help_cases").update({status:"advocacy_sent",advocacy_email_sent_at:new Date().toISOString(),advocacy_provider_id:sent.data?.id||null,updated_at:new Date().toISOString()}).eq("id",record.id),
      admin.from("audit_events").insert({actor_id:null,action:"howard_advocacy_email_sent",target_type:"howard_help_case",target_id:record.id,metadata_safe:{case_code:record.case_code,issue_type:record.issue_type}}),
      resend.emails.send({from:emailFrom,to:record.email,replyTo:"nationals@estherfundsinc.org",subject:`EFF sent your Howard reinstatement request – ${record.case_code}`,text:`Hello ${studentFirst},

Your email is verified, and EFF sent your individualized reinstatement request to Howard University. You and nationals@estherfundsinc.org were copied.

EFF requested complete reinstatement, restoration or preservation of your classes and housing, protection of pending aid, and an itemized account review. Howard University controls the enrollment decision, but EFF will continue advocating for the requested outcome.

Reply all when Howard responds so the case remains documented. Do not send Social Security numbers, passwords, verification codes, tax returns, full financial-account details, or unredacted student IDs.

Case number: ${record.case_code}

Esther Funds Foundation
Every Future Fulfilled`})
    ]);
    destination.searchParams.set("case","verified");destination.searchParams.set("code",record.case_code);destination.hash="case-intake";return NextResponse.redirect(destination);
  }catch(error){
    console.error("Howard advocacy email could not be sent",error);
    await admin.from("howard_help_cases").update({status:"delivery_failed",staff_note:"Advocacy email delivery failed after verification.",updated_at:new Date().toISOString()}).eq("id",record.id);
    destination.searchParams.set("error","Your email was verified, but the advocacy message could not be sent. EFF staff has been alerted.");destination.searchParams.set("code",record.case_code);destination.hash="case-intake";return NextResponse.redirect(destination);
  }
}
