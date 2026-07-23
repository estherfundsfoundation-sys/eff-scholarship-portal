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

const confirmationPage=(token:string,caseCode:string)=>`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Verify your Howard Help case | Esther Funds Foundation</title>
  <style>
    *{box-sizing:border-box}body{margin:0;background:#f5f0e6;color:#2d1748;font-family:Arial,sans-serif;line-height:1.6}
    main{min-height:100vh;display:grid;place-items:center;padding:28px}
    article{width:min(620px,100%);background:#fff;border:1px solid #d9cae8;border-radius:20px;box-shadow:0 18px 50px rgba(66,18,127,.12);padding:clamp(26px,6vw,48px)}
    .eyebrow{color:#7b48a6;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}
    h1{color:#42127f;font-size:clamp(30px,7vw,46px);line-height:1.08;margin:.4rem 0 1rem}
    .case{background:#f5f0e6;border-left:4px solid #42127f;padding:12px 14px;margin:20px 0}
    button{width:100%;border:0;border-radius:10px;background:#42127f;color:#fff;cursor:pointer;font-size:17px;font-weight:800;padding:15px 18px}
    button:hover,button:focus{background:#5d1b9a;outline:3px solid #b799e3;outline-offset:2px}
    small{display:block;color:#655a70;margin-top:18px}
  </style>
</head>
<body>
  <main>
    <article>
      <div class="eyebrow">Esther Funds Foundation · Howard Help Desk</div>
      <h1>One final confirmation</h1>
      <p>Your email link is valid. Press the button below to verify your authorization and send your individualized advocacy request.</p>
      <div class="case"><strong>Case number:</strong> ${caseCode}</div>
      <form method="post" action="/resources/howard-help/verify">
        <input type="hidden" name="token" value="${token}" />
        <button type="submit">Verify and send my advocacy request</button>
      </form>
      <small>This extra confirmation prevents university email-security scanners from submitting your case before you open the message.</small>
    </article>
  </main>
</body>
</html>`;

function redirectWith(request:NextRequest,params:Record<string,string>){
  const destination=new URL("/resources/howard-help",request.url);
  for(const [key,value] of Object.entries(params))destination.searchParams.set(key,value);
  destination.hash="case-intake";
  return NextResponse.redirect(destination);
}

async function findRecord(token:string){
  if(!/^[a-f0-9]{64}$/.test(token))return {admin:null,record:null};
  const admin=createAdminClient();
  const {data:record}=await admin.from("howard_help_cases").select("*").eq("verification_token_hash",hash(token)).maybeSingle();
  return {admin,record};
}

export async function GET(request:NextRequest){
  const token=request.nextUrl.searchParams.get("token")||"";
  if(!/^[a-f0-9]{64}$/.test(token))return redirectWith(request,{error:"That verification link is invalid."});
  const {record}=await findRecord(token);
  if(!record)return redirectWith(request,{error:"That verification link is invalid or no longer available."});
  if(record.advocacy_email_sent_at)return redirectWith(request,{case:"verified",code:record.case_code});
  if(!record.verification_expires_at||new Date(record.verification_expires_at).getTime()<Date.now())return redirectWith(request,{error:"That verification link expired. Contact EFF with your case number for help.",code:record.case_code});
  return new NextResponse(confirmationPage(token,record.case_code),{
    headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store, max-age=0"}
  });
}

export async function POST(request:NextRequest){
  const formData=await request.formData();
  const token=String(formData.get("token")||"");
  if(!/^[a-f0-9]{64}$/.test(token))return redirectWith(request,{error:"That verification link is invalid."});
  const {admin,record}=await findRecord(token);
  if(!admin||!record)return redirectWith(request,{error:"That verification link is invalid or no longer available."});
  if(record.advocacy_email_sent_at)return redirectWith(request,{case:"verified",code:record.case_code});
  if(!record.verification_expires_at||new Date(record.verification_expires_at).getTime()<Date.now())return redirectWith(request,{error:"That verification link expired. Contact EFF with your case number for help.",code:record.case_code});
  const destination=new URL("/resources/howard-help",request.url);
  const now=new Date().toISOString();const claimed=await admin.from("howard_help_cases").update({status:"sending",verified_at:now,updated_at:now}).eq("id",record.id).eq("status","pending_verification").select("id").maybeSingle();
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
