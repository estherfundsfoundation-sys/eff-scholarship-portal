"use server";

import {createHash,randomBytes,randomUUID} from "node:crypto";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {z} from "zod";
import {emailFrom,getResend} from "@/lib/email";
import {createAdminClient} from "@/lib/supabase/admin";

const caseSchema=z.object({
  studentName:z.string().trim().min(2).max(120),
  preferredName:z.string().trim().max(80).optional(),
  email:z.string().trim().email().max(180),
  phone:z.string().trim().max(40).optional(),
  studentType:z.enum(["Incoming first-year","Incoming transfer","Continuing undergraduate","Graduate or professional student","Other"]),
  issueType:z.enum(["Admission rescinded","Classes removed","Housing at risk","Unexpected balance change","Pending federal or institutional aid","Pending external scholarship","Pending waiver or discount","Payment plan problem","Other"]),
  enrollmentStatus:z.enum(["Admission canceled","Unregistered or inactive","Courses dropped or withdrawn","Housing canceled or at risk","Still enrolled but at immediate risk","Unsure"]),
  balanceBefore:z.string().regex(/^$|^\d{1,8}(\.\d{1,2})?$/),
  balanceNow:z.string().regex(/^$|^\d{1,8}(\.\d{1,2})?$/),
  schoolDeadline:z.string().trim().max(120).optional(),
  aidSummary:z.string().trim().min(30).max(1800),
  timeline:z.string().trim().min(80).max(4000),
  stepsTaken:z.string().trim().min(30).max(2500),
  authorizeEffContact:z.literal("on"),
  privacyConsent:z.literal("on"),
  accuracyCertified:z.literal("on"),
  anonymousAdvocacyConsent:z.string().optional()
});

const petitionSchema=z.object({
  fullName:z.string().trim().min(2).max(120),
  email:z.string().trim().email().max(180),
  affiliation:z.enum(["Affected Howard student","Howard student","Parent or family member","Howard alum","Educator or advocate","Community supporter"]),
  cityState:z.string().trim().max(120).optional(),
  displayAnonymously:z.string().optional(),
  petitionConsent:z.literal("on")
});

const value=(form:FormData,key:string)=>String(form.get(key)??"").trim();
const tokenHash=(token:string)=>createHash("sha256").update(token).digest("hex");
const money=(amount:string)=>amount?Number(amount):null;

async function requestContext(){
  const requestHeaders=await headers();
  const ip=requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
  const ipHash=createHash("sha256").update(`${process.env.CRON_SECRET||"eff-howard-help"}:${ip}`).digest("hex");
  const host=requestHeaders.get("x-forwarded-host")||requestHeaders.get("host")||"portal.estherfundsfoundation.org";
  const proto=requestHeaders.get("x-forwarded-proto")||"https";
  const origin=host.includes("localhost")?`${proto}://${host}`:"https://portal.estherfundsfoundation.org";
  return {ipHash,origin};
}

export async function submitHowardCase(formData:FormData){
  if(value(formData,"companyWebsite"))redirect("/resources/howard-help?case=pending");
  const parsed=caseSchema.safeParse({
    studentName:value(formData,"studentName"),preferredName:value(formData,"preferredName"),email:value(formData,"email").toLowerCase(),phone:value(formData,"phone"),
    studentType:value(formData,"studentType"),issueType:value(formData,"issueType"),enrollmentStatus:value(formData,"enrollmentStatus"),
    balanceBefore:value(formData,"balanceBefore").replace(/[$,\s]/g,""),balanceNow:value(formData,"balanceNow").replace(/[$,\s]/g,""),
    schoolDeadline:value(formData,"schoolDeadline"),aidSummary:value(formData,"aidSummary"),timeline:value(formData,"timeline"),stepsTaken:value(formData,"stepsTaken"),
    authorizeEffContact:value(formData,"authorizeEffContact"),privacyConsent:value(formData,"privacyConsent"),accuracyCertified:value(formData,"accuracyCertified"),
    anonymousAdvocacyConsent:value(formData,"anonymousAdvocacyConsent")
  });
  if(!parsed.success)redirect(`/resources/howard-help?error=${encodeURIComponent("Please complete every required field using only non-sensitive information.")}#case-intake`);
  const {ipHash,origin}=await requestContext();const admin=createAdminClient();
  const {data:existing}=await admin.from("howard_help_cases").select("id,case_code,status,verified_at,advocacy_email_sent_at").eq("email",parsed.data.email).maybeSingle();
  if(existing?.advocacy_email_sent_at)redirect(`/resources/howard-help?case=verified&code=${encodeURIComponent(existing.case_code)}#case-intake`);
  if(existing&&["sending","advocacy_sent","howard_review","reinstated"].includes(existing.status))redirect(`/resources/howard-help?case=pending&code=${encodeURIComponent(existing.case_code)}#case-intake`);
  const rawToken=randomBytes(32).toString("hex");const id=existing?.id??randomUUID();const caseCode=existing?.case_code??`HU-${new Date().getUTCFullYear()}-${id.slice(0,8).toUpperCase()}`;
  const expires=new Date(Date.now()+24*60*60*1000).toISOString();
  const caseRecord={
    id,case_code:caseCode,student_name:parsed.data.studentName,preferred_name:parsed.data.preferredName||null,email:parsed.data.email,phone:parsed.data.phone||null,
    student_type:parsed.data.studentType,issue_type:parsed.data.issueType,enrollment_status:parsed.data.enrollmentStatus,
    balance_before:money(parsed.data.balanceBefore),balance_now:money(parsed.data.balanceNow),school_deadline:parsed.data.schoolDeadline||null,
    aid_summary:parsed.data.aidSummary,timeline:parsed.data.timeline,steps_taken:parsed.data.stepsTaken,
    authorize_eff_contact:true,anonymous_advocacy_consent:parsed.data.anonymousAdvocacyConsent==="on",privacy_consent:true,accuracy_certified:true,
    verification_token_hash:tokenHash(rawToken),verification_expires_at:expires,verified_at:null,advocacy_email_sent_at:null,advocacy_provider_id:null,
    status:"pending_verification",staff_note:existing?"Student resubmitted after an incomplete or failed delivery.":null,ip_hash:ipHash,updated_at:new Date().toISOString()
  };
  const saved=existing
    ?await admin.from("howard_help_cases").update(caseRecord).eq("id",existing.id)
    :await admin.from("howard_help_cases").insert(caseRecord);
  if(saved.error)redirect(`/resources/howard-help?error=${encodeURIComponent("Your case could not be saved. Please try again.")}#case-intake`);
  try{
    const resend=getResend();const verifyUrl=`${origin}/resources/howard-help/verify?token=${rawToken}`;
    const sent=await resend.emails.send({from:emailFrom,to:parsed.data.email,replyTo:"nationals@estherfundsinc.org",subject:`We received your Howard Help case ${caseCode} — verify your email`,html:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#2d1748;max-width:640px;margin:0 auto">
<p style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7b48a6">Esther Funds Foundation · Howard Help Desk</p>
<h1 style="color:#42127F;font-size:28px;line-height:1.2">We received your case.</h1>
<p>Hello ${parsed.data.preferredName||parsed.data.studentName},</p>
<p>Thank you for contacting Esther Funds Foundation. EFF does not underestimate the urgency or importance of your need.</p>
<p>Your case number is <strong>${caseCode}</strong>. One step remains before EFF can contact Howard: verify your email and authorization within 24 hours.</p>
<p><a href="${verifyUrl}" style="display:inline-block;background:#42127F;color:#fff;padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:700">Verify my email and send my advocacy request</a></p>
<p>After verification, EFF will automatically send one individualized reinstatement request to Howard University and copy you and EFF. You will receive a second email confirming that the advocacy request was sent.</p>
<p style="padding:12px 14px;background:#f5f0e6;border-left:4px solid #42127F"><strong>Protect your privacy:</strong> Never email Social Security numbers, passwords, verification codes, tax returns, full financial-account details, or unredacted student IDs.</p>
<p>Howard University—not EFF—controls enrollment decisions, but complete reinstatement is the relief EFF will request.</p>
<p>With care,<br/><strong>Esther Funds Foundation</strong><br/>Every Future Fulfilled</p>
</div>`,text:`Hello ${parsed.data.preferredName||parsed.data.studentName},

Thank you for contacting Esther Funds Foundation. EFF does not underestimate the urgency or importance of your need.

We received your Howard Help Desk case.
Case number: ${caseCode}

Please verify your email and authorization within 24 hours:
${verifyUrl}

After verification, EFF will automatically send one individualized reinstatement request to Howard University and copy you and EFF. You will receive a second email confirming that the advocacy request was sent. Howard University—not EFF—controls enrollment decisions, but complete reinstatement is the relief EFF will request.

Never email Social Security numbers, passwords, verification codes, tax returns, full financial-account details, or unredacted student IDs.

Esther Funds Foundation
Every Future Fulfilled`});
    if(sent.error)throw new Error(sent.error.message);
  }catch(error){
    console.error("Howard case verification email could not be sent",error);
    await admin.from("howard_help_cases").update({status:"delivery_failed",staff_note:"Verification email delivery failed.",updated_at:new Date().toISOString()}).eq("id",id);
    redirect(`/resources/howard-help?error=${encodeURIComponent("We saved your case but could not send the verification email. Please contact nationals@estherfundsinc.org with only your case number.")}&code=${caseCode}#case-intake`);
  }
  redirect(`/resources/howard-help?case=pending&code=${caseCode}#case-intake`);
}

export async function signHowardPetition(formData:FormData){
  if(value(formData,"organizationWebsite"))redirect("/resources/howard-help?petition=pending#petition");
  const parsed=petitionSchema.safeParse({fullName:value(formData,"fullName"),email:value(formData,"email").toLowerCase(),affiliation:value(formData,"affiliation"),cityState:value(formData,"cityState"),displayAnonymously:value(formData,"displayAnonymously"),petitionConsent:value(formData,"petitionConsent")});
  if(!parsed.success)redirect(`/resources/howard-help?petitionError=${encodeURIComponent("Please complete the petition form and consent to verification.")}#petition`);
  const {ipHash,origin}=await requestContext();const admin=createAdminClient();
  const {data:existing}=await admin.from("howard_petition_signatures").select("verified_at").eq("email",parsed.data.email).maybeSingle();
  if(existing)redirect(`/resources/howard-help?petition=${existing.verified_at?"verified":"pending"}#petition`);
  const rawToken=randomBytes(32).toString("hex");const id=randomUUID();const expires=new Date(Date.now()+24*60*60*1000).toISOString();
  const inserted=await admin.from("howard_petition_signatures").insert({id,full_name:parsed.data.fullName,email:parsed.data.email,affiliation:parsed.data.affiliation,city_state:parsed.data.cityState||null,display_anonymously:parsed.data.displayAnonymously==="on",verification_token_hash:tokenHash(rawToken),verification_expires_at:expires,ip_hash:ipHash});
  if(inserted.error)redirect(`/resources/howard-help?petitionError=${encodeURIComponent("Your signature could not be saved. Please try again.")}#petition`);
  try{
    const resend=getResend();const verifyUrl=`${origin}/resources/howard-help/petition/verify?token=${rawToken}`;
    const sent=await resend.emails.send({from:emailFrom,to:parsed.data.email,replyTo:"nationals@estherfundsinc.org",subject:"Verify your EFF Howard reinstatement petition signature",text:`Hello ${parsed.data.fullName},

Thank you for standing with affected Howard University students. Verify your petition signature within 24 hours:
${verifyUrl}

Your email will not be displayed publicly. If you selected anonymous display, your name will not be shown in any public signature list.

Esther Funds Foundation
Every Future Fulfilled`});
    if(sent.error)throw new Error(sent.error.message);
  }catch(error){
    console.error("Howard petition verification email could not be sent",error);
    redirect(`/resources/howard-help?petitionError=${encodeURIComponent("We could not send your verification email. Please try again later.")}#petition`);
  }
  redirect("/resources/howard-help?petition=pending#petition");
}
