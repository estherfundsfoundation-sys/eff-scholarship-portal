"use server";

import {createHash,randomBytes,randomUUID} from "node:crypto";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {z} from "zod";
import {emailFrom,getResend} from "@/lib/email";
import {createAdminClient} from "@/lib/supabase/admin";
import {helpRouting} from "@/lib/student-help-routing";
import {classifyHelpDeskMessage,PRIVACY_RESPONSE,SAFETY_RESPONSE} from "@/lib/help-desk/safety";
import {sendLeadershipAlert} from "@/lib/help-desk/email";

const schema=z.object({
  studentName:z.string().trim().min(2).max(120),preferredName:z.string().trim().max(80).optional(),
  email:z.string().trim().email().max(180),phone:z.string().trim().max(40).optional(),
  schoolName:z.string().trim().min(2).max(180),schoolState:z.string().length(2),
  collegeUnitid:z.string().regex(/^$|^\d{6}$/),
  schoolType:z.enum(["HBCU","PWI or other institution","Unsure"]),
  studentLevel:z.enum(["Incoming student","Undergraduate","Graduate or professional","Community college or certificate","Other"]),
  issueType:z.enum(["Financial aid or FAFSA","Past-due balance or registration hold","Admissions or enrollment","Housing or food insecurity","Academic records or transfer","Disability or accessibility support","International or veteran services","Technology access","Discrimination, safety, or student rights","Other"]),
  urgency:z.enum(["Immediate â€” within 72 hours","This week","Within 30 days","No fixed deadline"]),
  schoolDeadline:z.string().optional(),amountAtRisk:z.string().regex(/^$|^\d{1,8}(\.\d{1,2})?$/),
  situationSummary:z.string().trim().min(80).max(4000),stepsTaken:z.string().trim().min(20).max(2500),
  departmentSought:z.string().trim().max(160).optional(),documentsAvailable:z.array(z.string()).max(12),
  essentialsRequested:z.string().optional(),essentialsTerm:z.string().optional(),essentialsCategory:z.string().optional(),essentialsAmount:z.string().optional(),
  essentialsExplanation:z.string().max(1800).optional(),preferredPaymentMethod:z.string().max(120).optional(),
  authorizeEffContact:z.literal("on"),privacyConsent:z.literal("on"),accuracyCertified:z.literal("on")
}).superRefine((data,ctx)=>{
  if(data.essentialsRequested==="on"){
    const amount=Number(data.essentialsAmount);
    if(!["Fall","Spring"].includes(data.essentialsTerm||"")||!data.essentialsCategory||!Number.isFinite(amount)||amount<=0||amount>100||!data.essentialsExplanation||data.essentialsExplanation.trim().length<40)
      ctx.addIssue({code:"custom",path:["essentialsAmount"],message:"Complete the Fall Essentials request (maximum $100)."});
  }
});

const value=(form:FormData,key:string)=>String(form.get(key)??"").trim();
const hash=(token:string)=>createHash("sha256").update(token).digest("hex");
const escapeHtml=(text:string)=>text.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");

export async function submitStudentHelpCase(formData:FormData){
  if(value(formData,"companyWebsite"))redirect("/resources/student-help?case=pending");
  const parsed=schema.safeParse({
    studentName:value(formData,"studentName"),preferredName:value(formData,"preferredName"),email:value(formData,"email").toLowerCase(),phone:value(formData,"phone"),
    schoolName:value(formData,"schoolName"),schoolState:value(formData,"schoolState"),schoolType:value(formData,"schoolType"),collegeUnitid:value(formData,"collegeUnitid"),studentLevel:value(formData,"studentLevel"),
    issueType:value(formData,"issueType"),urgency:value(formData,"urgency"),schoolDeadline:value(formData,"schoolDeadline"),
    amountAtRisk:value(formData,"amountAtRisk").replace(/[$,\s]/g,""),situationSummary:value(formData,"situationSummary"),stepsTaken:value(formData,"stepsTaken"),
    departmentSought:value(formData,"departmentSought"),documentsAvailable:formData.getAll("documentsAvailable").map(String),
    essentialsRequested:value(formData,"essentialsRequested"),essentialsTerm:value(formData,"essentialsTerm"),essentialsCategory:value(formData,"essentialsCategory"),essentialsAmount:value(formData,"essentialsAmount").replace(/[$,\s]/g,""),
    essentialsExplanation:value(formData,"essentialsExplanation"),preferredPaymentMethod:value(formData,"preferredPaymentMethod"),
    authorizeEffContact:value(formData,"authorizeEffContact"),privacyConsent:value(formData,"privacyConsent"),accuracyCertified:value(formData,"accuracyCertified")
  });
  if(!parsed.success)redirect(`/resources/student-help?error=${encodeURIComponent("Please complete every required field. Fall Essentials requests may not exceed $100.")}#open-case`);
  const requestHeaders=await headers();const ip=requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
  const ipHash=createHash("sha256").update(`${process.env.CRON_SECRET||"eff-student-help"}:${ip}`).digest("hex");
  const host=requestHeaders.get("x-forwarded-host")||requestHeaders.get("host")||"portal.estherfundsfoundation.org";
  const origin=host.includes("localhost")?`http://${host}`:"https://portal.estherfundsfoundation.org";
  const admin=createAdminClient();let officialSchool:null|{unitid:number;name:string;state:string;hbcu:boolean}=null;
  if(parsed.data.collegeUnitid){const {data}=await admin.from("college_directory").select("unitid,name,state,hbcu").eq("unitid",Number(parsed.data.collegeUnitid)).eq("active",true).maybeSingle();officialSchool=data;}
  const schoolName=officialSchool?.name??parsed.data.schoolName;const schoolState=officialSchool?.state??parsed.data.schoolState;const schoolType=officialSchool?(officialSchool.hbcu?"HBCU":"PWI or other institution"):parsed.data.schoolType;
  const intakeClassification=classifyHelpDeskMessage(`${parsed.data.situationSummary}\n${parsed.data.stepsTaken}\n${parsed.data.essentialsExplanation||""}`);
  const rawToken=randomBytes(32).toString("hex");const id=randomUUID();
  const caseCode=`EFF-${new Date().getUTCFullYear()}-${id.slice(0,8).toUpperCase()}`;const essentials=parsed.data.essentialsRequested==="on";
  const record={
    id,case_code:caseCode,student_name:parsed.data.studentName,preferred_name:parsed.data.preferredName||null,email:parsed.data.email,phone:parsed.data.phone||null,
    college_unitid:officialSchool?.unitid??null,school_name:schoolName,school_state:schoolState,school_type:schoolType,student_level:parsed.data.studentLevel,
    issue_type:parsed.data.issueType,urgency:parsed.data.urgency,school_deadline:parsed.data.schoolDeadline||null,amount_at_risk:parsed.data.amountAtRisk?Number(parsed.data.amountAtRisk):null,
    situation_summary:parsed.data.situationSummary,steps_taken:parsed.data.stepsTaken,documents_available:parsed.data.documentsAvailable,department_sought:parsed.data.departmentSought||null,
    essentials_requested:essentials,essentials_term:essentials?parsed.data.essentialsTerm:null,essentials_category:essentials?parsed.data.essentialsCategory:null,essentials_amount:essentials?Number(parsed.data.essentialsAmount):null,
    essentials_explanation:essentials?parsed.data.essentialsExplanation:null,preferred_payment_method:essentials&&parsed.data.preferredPaymentMethod?parsed.data.preferredPaymentMethod:null,
    essentials_status:essentials?"requested":"not_requested",recommended_department:helpRouting[parsed.data.issueType]?.department??helpRouting.Other.department,authorize_eff_contact:true,privacy_consent:true,accuracy_certified:true,
    verification_token_hash:hash(rawToken),verification_expires_at:new Date(Date.now()+24*60*60*1000).toISOString(),ip_hash:ipHash
  };
  const saved=await admin.from("student_help_cases").insert(record);
  if(saved.error){console.error("National help case save failed",saved.error);redirect(`/resources/student-help?error=${encodeURIComponent("Your case could not be saved. Please try again.")}#open-case`);}
  const verifyUrl=`${origin}/resources/student-help/verify?token=${rawToken}`;
  try{
    const studentName=parsed.data.preferredName||parsed.data.studentName;
    const safeStudentName=escapeHtml(studentName);const safeSchoolName=escapeHtml(schoolName);
    const sent=await getResend().emails.send({from:emailFrom,to:parsed.data.email,replyTo:"nationals@estherfundsinc.org",subject:`Case submitted â€” verify your EFF Student Help case ${caseCode}`,html:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#2d1748;max-width:640px;margin:0 auto">
<h1 style="color:#42127F">Case submitted</h1>
<p>Hello ${safeStudentName},</p>
<p>We received your National Student Help Desk case for <strong>${safeSchoolName}</strong>.</p>
<p style="background:#F5F0E6;border-left:5px solid #42127F;padding:14px 18px"><strong>Case number: ${caseCode}</strong></p>
${intakeClassification.safety?`<p style="background:#FFF2E1;border-left:5px solid #A13A1B;padding:14px 18px"><strong>Immediate safety support</strong><br/>${escapeHtml(SAFETY_RESPONSE).replaceAll("\n","<br/>")}</p>`:""}
${intakeClassification.privacy?`<p style="background:#FFF2E1;border-left:5px solid #A13A1B;padding:14px 18px">${escapeHtml(PRIVACY_RESPONSE)}</p>`:""}
<p>Verify your email within 24 hours so your case can enter the live review line.</p>
<p><a href="${verifyUrl}" style="display:inline-block;background:#42127F;color:#FFFFFF;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Verify my email and enter the review line</a></p>
<p>After verification, EFF will identify the likely school department, prepare a document checklist, and send meaningful follow-up updates.</p>
${essentials?`<p>Your ${parsed.data.essentialsTerm} Student Essentials request of up to $100 will be reviewed separately. Funding is limited and assistance is not guaranteed.</p>`:""}
<p><strong>Safety reminder:</strong> Do not email Social Security numbers, passwords, tax returns, bank details, or unredacted student IDs.</p>
<p>Esther Funds Foundation<br><em>Every Future Fulfilled</em></p>
</div>`,text:`Hello ${studentName},

We received your national Student Help Desk case for ${schoolName}.
Case number: ${caseCode}

Verify your email within 24 hours:
${verifyUrl}

${intakeClassification.safety?SAFETY_RESPONSE:""}
${intakeClassification.privacy?PRIVACY_RESPONSE:""}

After verification, EFF will review your case, identify the likely school department and document checklist, and send follow-up updates. ${essentials?`Your ${parsed.data.essentialsTerm} Student Essentials request (up to $100) will be reviewed separately. Funding is limited and not guaranteed. EFF will confirm any payment method only after approval.`:""}

Do not email Social Security numbers, passwords, tax returns, bank details, or unredacted student IDs.

Esther Funds Foundation
Every Future Fulfilled`});
    if(sent.error)throw new Error(sent.error.message);
    await admin.from("student_help_case_events").insert({case_id:id,event_type:"verification_email_sent",summary:`Automatic verification email accepted for delivery to ${parsed.data.email}.`});
    if(intakeClassification.safety||intakeClassification.conduct||intakeClassification.privacy){try{await sendLeadershipAlert(caseCode,`Intake triggered ${intakeClassification.reasons.join(", ")}. Student received the immediate safety/privacy notice where applicable.`);}catch(alertError){console.error("Intake escalation alert failed",alertError);}}
  }catch(error){
    console.error("National help verification email failed",error);
    await admin.from("student_help_cases").update({status:"delivery_failed"}).eq("id",id);
    redirect(`/resources/student-help?error=${encodeURIComponent("We saved your case but could not send verification. Please reopen the National Help Desk and try again with your case number available.")}&code=${caseCode}#open-case`);
  }
  redirect(`/resources/student-help?case=pending&code=${caseCode}${intakeClassification.safety?"&safety=1":""}#open-case`);
}
