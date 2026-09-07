"use server";
import {createHash,randomUUID} from "node:crypto";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {requireAdmin} from "@/lib/auth/staff";
import {futureLinkAgreementVersion,futureLinkCodeVersion,scoreFutureLinkMatch,type FutureLinkProfile} from "@/lib/futurelink";
import {queueFutureLinkEmail} from "@/lib/futurelink-email";
import {runFutureLinkMatching} from "@/lib/futurelink-matching";

const text=(form:FormData,key:string,max=1000)=>String(form.get(key)??"").trim().slice(0,max);
const list=(form:FormData,key:string)=>form.getAll(key).map(String).map(v=>v.trim()).filter(Boolean).slice(0,20);
const allowedTypes=new Set(["image/jpeg","image/png","image/webp","application/pdf"]);
const imageTypes=new Set(["image/jpeg","image/png","image/webp"]);
const ageOn=(date:string)=>{const dob=new Date(`${date}T12:00:00Z`);const now=new Date();let age=now.getUTCFullYear()-dob.getUTCFullYear();if(now.getUTCMonth()<dob.getUTCMonth()||(now.getUTCMonth()===dob.getUTCMonth()&&now.getUTCDate()<dob.getUTCDate()))age--;return age;};
const safeExt=(file:File)=>({"image/jpeg":"jpg","image/png":"png","image/webp":"webp","application/pdf":"pdf"}[file.type]??"bin");

async function currentUser(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/sign-in?next=/future-link/apply");return {supabase,user};}

export async function saveFutureLinkProfile(form:FormData){
  const {user}=await currentUser();const admin=createAdminClient();
  if(text(form,"website",200))redirect("/future-link?message=Thank%20you");
  const participantType=text(form,"participantType",40);const dob=text(form,"dateOfBirth",20);
  const isStudent=participantType.startsWith("student_");
  const schoolEmail=text(form,"schoolEmail",254).toLowerCase();
  const profilePhoto=form.get("profilePhoto") as File|null;const verification=form.get("verificationDocument") as File|null;
  const fail=(message:string)=>redirect(`/future-link/apply?error=${encodeURIComponent(message)}`);
  if(!["student_mentee","student_peer_mentor","student_both","professional_mentor"].includes(participantType))fail("Choose how you want to participate.");
  if(!user.email_confirmed_at)fail("Verify your portal email before submitting a FutureLink profile.");
  if(!dob||ageOn(dob)<18)fail("FutureLink is currently available only to adults age 18 or older.");
  if(!profilePhoto||profilePhoto.size===0||!imageTypes.has(profilePhoto.type)||profilePhoto.size>6_291_456)fail("Upload a JPG, PNG, or WebP profile photo smaller than 6 MB.");
  if(isStudent&&!schoolEmail.endsWith(".edu")&&(!verification||verification.size===0))fail("Use a .edu school email or upload current enrollment evidence.");
  if(!isStudent&&(!verification||verification.size===0))fail("Graduate and professional mentors must upload a credential or identity-verification document for private review.");
  if(verification&&verification.size>0&&(!allowedTypes.has(verification.type)||verification.size>8_388_608))fail("Verification must be a JPG, PNG, WebP, or PDF smaller than 8 MB.");
  if(form.get("adultConfirmed")!=="yes"||form.get("accuracyConfirmed")!=="yes"||form.get("privacyConfirmed")!=="yes"||form.get("codeAccepted")!=="yes")fail("Accept every safety and accuracy certification before submitting.");
  const checkedPhoto=profilePhoto as File;
  const photoPath=`${user.id}/profile-${randomUUID()}.${safeExt(checkedPhoto)}`;
  const photoUpload=await admin.storage.from("futurelink-profile-media").upload(photoPath,checkedPhoto,{contentType:checkedPhoto.type,upsert:false});
  if(photoUpload.error)fail("Your photo could not be uploaded. Please try again.");
  let verificationPath:string|null=null;
  if(verification&&verification.size>0){verificationPath=`${user.id}/verification-${randomUUID()}.${safeExt(verification)}`;const upload=await admin.storage.from("futurelink-private").upload(verificationPath,verification,{contentType:verification.type,upsert:false});if(upload.error)fail("Your verification document could not be uploaded. Please try again.");}
  const record={
    user_id:user.id,participant_type:participantType,status:"verification_pending",verification_status:"pending",
    legal_name:text(form,"legalName",120),display_name:text(form,"displayName",80),date_of_birth:dob,
    school_email:schoolEmail||null,school:text(form,"school",180)||null,degree_level:text(form,"degreeLevel",80)||null,
    academic_field:text(form,"academicField",120)||null,minor_field:text(form,"minorField",120)||null,
    graduation_year:Number(text(form,"graduationYear",4))||null,classification:text(form,"classification",80)||null,
    college_attended:text(form,"collegeAttended",180)||null,profession:text(form,"profession",160)||null,
    years_experience:Number(text(form,"yearsExperience",2))||null,career_fields:list(form,"careerFields"),industries:list(form,"careerFields"),
    support_needed:list(form,"supportNeeded"),support_offered:list(form,"supportOffered"),experience_tags:list(form,"experienceTags"),
    city:text(form,"city",100)||null,state:text(form,"state",80)||null,timezone:text(form,"timezone",40)||null,
    hobbies:text(form,"hobbies",600)||null,bio:text(form,"bio",1200)||null,why_joined:text(form,"whyJoined",1200)||null,
    meeting_format:text(form,"meetingFormat",40)||null,communication_styles:list(form,"communicationStyles"),meeting_cadence:text(form,"meetingCadence",40)||null,
    availability:list(form,"availability"),mentor_capacity:Math.min(5,Math.max(1,Number(text(form,"mentorCapacity",1))||1)),
    approved_contact_methods:list(form,"approvedContactMethods"),phone_private:text(form,"phone",40)||null,
    profile_photo_path:photoPath,verification_document_path:verificationPath,verification_document_name:verification?.name||null,
    verification_document_type:verification?text(form,"verificationType",80)||verification.type:null,
    code_version:futureLinkCodeVersion,code_accepted_at:new Date().toISOString(),accuracy_confirmed:true,adult_confirmed:true,privacy_confirmed:true,
    submitted_at:new Date().toISOString(),updated_at:new Date().toISOString(),review_note:null
  };
  if(!record.legal_name||!record.display_name||!record.academic_field||!record.career_fields.length||!record.timezone||!record.availability.length)fail("Complete every required profile and matching field.");
  const {error}=await admin.from("futurelink_profiles").upsert(record,{onConflict:"user_id"});
  if(error){console.error("FutureLink profile submission failed",error);fail("We could not save your profile. Please try again.");}
  await admin.from("audit_events").insert({actor_id:user.id,action:"futurelink_profile_submitted",target_type:"futurelink_profile",target_id:user.id,metadata_safe:{participant_type:participantType,verification_method:schoolEmail.endsWith(".edu")?"edu_email":"document"}});
  await queueFutureLinkEmail({userId:user.id,templateKey:"futurelink_application_received",idempotencyKey:`futurelink-received:${user.id}:${record.submitted_at}`,payload:{application_path:"/future-link/dashboard"}});
  redirect("/future-link/dashboard?submitted=1");
}

export async function respondToMatch(form:FormData){const {supabase,user}=await currentUser();const matchId=text(form,"matchId",50);const accept=text(form,"decision",10)==="accept";const {data,error}=await supabase.rpc("futurelink_accept_match",{p_match:matchId,p_accept:accept});if(error)redirect(`/future-link/dashboard?error=${encodeURIComponent("We could not record that response.")}`);await createAdminClient().from("audit_events").insert({actor_id:user.id,action:accept?"futurelink_match_accepted":"futurelink_match_declined",target_type:"futurelink_match",target_id:matchId,metadata_safe:{status:data}});revalidatePath("/future-link/dashboard");}

export async function completeFutureLinkOnboarding(form:FormData){
  const {user}=await currentUser();
  if(form.get("programAccepted")!=="yes"||form.get("boundariesAccepted")!=="yes"||form.get("meetingAccepted")!=="yes")redirect("/future-link/dashboard?error=Complete%20all%20onboarding%20acknowledgements");
  const admin=createAdminClient();const now=new Date().toISOString();
  const {data:profile}=await admin.from("futurelink_profiles").select("verification_status,status").eq("user_id",user.id).maybeSingle();
  if(!profile||profile.verification_status!=="approved")redirect("/future-link/dashboard?error=National%20Office%20verification%20is%20required%20first");
  await admin.from("futurelink_profiles").update({orientation_completed_at:now,readiness_acknowledged_at:now,status:["approved","match_eligible"].includes(profile.status)?"searching_for_match":profile.status,updated_at:now}).eq("user_id",user.id);
  await admin.from("audit_events").insert({actor_id:user.id,action:"futurelink_onboarding_completed",target_type:"futurelink_profile",target_id:user.id,metadata_safe:{version:futureLinkCodeVersion}});
  await queueFutureLinkEmail({userId:user.id,templateKey:"futurelink_onboarding_complete",idempotencyKey:`futurelink-onboarding:${user.id}`,payload:{application_path:"/future-link/dashboard"}});
  await runFutureLinkMatching(25);revalidatePath("/future-link/dashboard");
}

export async function updateFutureLinkPreferences(form:FormData){
  const {user}=await currentUser();const admin=createAdminClient();
  const cadence=text(form,"meetingCadence",40);const format=text(form,"meetingFormat",40);const timezone=text(form,"timezone",40);const availability=list(form,"availability");
  if(!["Weekly","Every other week","Monthly"].includes(cadence)||!["Virtual","In person","Either"].includes(format)||!timezone||!availability.length)redirect("/future-link/dashboard?error=Complete%20all%20matching%20preferences");
  await admin.from("futurelink_profiles").update({meeting_cadence:cadence,meeting_format:format,timezone,availability,updated_at:new Date().toISOString()}).eq("user_id",user.id);
  await admin.from("audit_events").insert({actor_id:user.id,action:"futurelink_matching_preferences_updated",target_type:"futurelink_profile",target_id:user.id,metadata_safe:{cadence,format,timezone,availability_count:availability.length}});
  revalidatePath("/future-link/dashboard");
}

export async function saveFutureLinkMeetingPlan(form:FormData){
  const {user}=await currentUser();const admin=createAdminClient();const matchId=text(form,"matchId",50);
  const {data:match}=await admin.from("futurelink_matches").select("id,mentee_id,mentor_id,status").eq("id",matchId).maybeSingle();
  if(!match||match.status!=="active"||![match.mentee_id,match.mentor_id].includes(user.id))redirect("/future-link/dashboard?error=An%20active%20match%20is%20required");
  const cadence=text(form,"cadence",40),weekday=text(form,"weekday",20),localTime=text(form,"localTime",8),timezone=text(form,"timezone",40),zoomUrl=text(form,"zoomUrl",500),nextMeeting=text(form,"nextMeeting",40),notes=text(form,"notes",1000);
  if(!["Weekly","Every other week","Monthly"].includes(cadence)||!["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].includes(weekday)||!/^\d{2}:\d{2}$/.test(localTime)||!timezone)redirect("/future-link/dashboard?error=Complete%20the%20meeting%20plan");
  if(zoomUrl){try{const parsed=new URL(zoomUrl);if(parsed.protocol!=="https:"||!/(^|\.)zoom\.us$|(^|\.)zoomgov\.com$/.test(parsed.hostname))throw new Error();}catch{redirect("/future-link/dashboard?error=Enter%20a%20valid%20Zoom%20meeting%20link");}}
  const nextMeetingAt=nextMeeting?new Date(nextMeeting):null;if(nextMeetingAt&&Number.isNaN(nextMeetingAt.getTime()))redirect("/future-link/dashboard?error=Choose%20a%20valid%20next%20meeting%20date");
  const now=new Date().toISOString();await admin.from("futurelink_meeting_plans").upsert({match_id:matchId,cadence,weekday,local_time:localTime,timezone,zoom_url_private:zoomUrl||null,next_meeting_at:nextMeetingAt?.toISOString()??null,notes_private:notes||null,updated_by:user.id,last_reminder_for:null,updated_at:now},{onConflict:"match_id"});
  await admin.from("audit_events").insert({actor_id:user.id,action:"futurelink_meeting_plan_updated",target_type:"futurelink_match",target_id:matchId,metadata_safe:{cadence,weekday,timezone,zoom_link_present:Boolean(zoomUrl),next_meeting_present:Boolean(nextMeeting)}});
  for(const id of [match.mentee_id,match.mentor_id])await queueFutureLinkEmail({userId:id,templateKey:"futurelink_meeting_plan",idempotencyKey:`futurelink-plan:${matchId}:${id}:${Date.now()}`,payload:{message:`Your recurring ${cadence.toLowerCase()} Zoom meeting plan was updated for ${weekday}s at ${localTime} ${timezone}.`,application_path:"/future-link/dashboard"}});
  revalidatePath("/future-link/dashboard");
}

export async function signFutureLinkAgreement(form:FormData){
  const {user}=await currentUser();const admin=createAdminClient();const matchId=text(form,"matchId",50);const legalName=text(form,"legalName",120);if(!legalName||form.get("agreementAccepted")!=="yes")redirect("/future-link/dashboard?error=Agreement%20signature%20is%20required");
  const {data:match}=await admin.from("futurelink_matches").select("id,mentee_id,mentor_id,status").eq("id",matchId).maybeSingle();if(!match||![match.mentee_id,match.mentor_id].includes(user.id)||match.status!=="agreement_required")redirect("/future-link/dashboard?error=Agreement%20is%20not%20available");
  const requestHeaders=await headers();const rawIp=requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()??"unknown";const ipHash=createHash("sha256").update(`${process.env.CRON_SECRET??"eff"}:${rawIp}`).digest("hex");
  await admin.from("futurelink_agreements").upsert({match_id:matchId,user_id:user.id,agreement_version:futureLinkAgreementVersion,legal_name:legalName,signed_at:new Date().toISOString(),ip_hash:ipHash,user_agent_safe:(requestHeaders.get("user-agent")??"").slice(0,300)},{onConflict:"match_id,user_id"});
  const {data:signatures}=await admin.from("futurelink_agreements").select("user_id").eq("match_id",matchId);
  if((signatures??[]).length>=2){const now=new Date().toISOString();await admin.from("futurelink_matches").update({status:"active",contact_released_at:now,updated_at:now}).eq("id",matchId);await admin.from("futurelink_profiles").update({status:"active_match",updated_at:now}).in("user_id",[match.mentee_id,match.mentor_id]);for(const id of [match.mentee_id,match.mentor_id])await queueFutureLinkEmail({userId:id,templateKey:"futurelink_connection_active",idempotencyKey:`futurelink-active:${matchId}:${id}`,payload:{application_path:"/future-link/dashboard"}});}
  await admin.from("audit_events").insert({actor_id:user.id,action:"futurelink_agreement_signed",target_type:"futurelink_match",target_id:matchId,metadata_safe:{version:futureLinkAgreementVersion}});revalidatePath("/future-link/dashboard");
}

export async function logFutureLinkSession(form:FormData){const {user}=await currentUser();const admin=createAdminClient();const matchId=text(form,"matchId",50);const {data:match}=await admin.from("futurelink_matches").select("mentee_id,mentor_id,status").eq("id",matchId).maybeSingle();if(!match||match.mentor_id!==user.id||match.status!=="active")redirect("/future-link/dashboard?error=Active%20mentor%20match%20required");const {error}=await admin.from("futurelink_sessions").insert({match_id:matchId,mentor_id:user.id,mentee_id:match.mentee_id,session_date:text(form,"sessionDate",10),started_at:text(form,"startedAt",8)||null,duration_minutes:Number(text(form,"durationMinutes",3)),format:text(form,"format",30),category:text(form,"category",100),reflection:text(form,"reflection",1000)||null});if(error)redirect("/future-link/dashboard?error=Session%20could%20not%20be%20saved");await queueFutureLinkEmail({userId:match.mentee_id,templateKey:"futurelink_session_confirmation",idempotencyKey:`futurelink-session:${matchId}:${Date.now()}`,payload:{application_path:"/future-link/dashboard"}});revalidatePath("/future-link/dashboard");}

export async function confirmFutureLinkSession(form:FormData){const {supabase}=await currentUser();const {error}=await supabase.rpc("futurelink_confirm_session",{p_session:text(form,"sessionId",50),p_confirm:text(form,"decision",10)==="confirm",p_note:text(form,"note",1000)||null});if(error)redirect("/future-link/dashboard?error=Session%20response%20could%20not%20be%20saved");revalidatePath("/future-link/dashboard");}

export async function issueFutureLinkServiceVerification(){const {user}=await currentUser();const admin=createAdminClient();const {data:sessions}=await admin.from("futurelink_sessions").select("id,duration_minutes").eq("mentor_id",user.id).eq("status","confirmed");const confirmed=sessions??[];if(!confirmed.length)redirect("/future-link/dashboard?error=At%20least%20one%20confirmed%20session%20is%20required");const minutes=confirmed.reduce((sum,row)=>sum+row.duration_minutes,0);const {data,error}=await admin.from("futurelink_service_verifications").insert({mentor_id:user.id,confirmed_sessions:confirmed.length,confirmed_minutes:minutes}).select("verification_code").single();if(error||!data)redirect("/future-link/dashboard?error=Service%20verification%20could%20not%20be%20created");await admin.from("audit_events").insert({actor_id:user.id,action:"futurelink_service_verification_issued",target_type:"futurelink_profile",target_id:user.id,metadata_safe:{sessions:confirmed.length,minutes}});redirect(`/future-link/service-verification/${data.verification_code}`);}

export async function requestFutureLinkRematch(form:FormData){const {user}=await currentUser();const admin=createAdminClient();const matchId=text(form,"matchId",50);const reason=text(form,"reason",500)||"Participant requested a new match";const {data:match}=await admin.from("futurelink_matches").select("mentee_id,mentor_id,status").eq("id",matchId).maybeSingle();if(!match||![match.mentee_id,match.mentor_id].includes(user.id))return;const now=new Date().toISOString();await admin.from("futurelink_matches").update({status:"ended",ended_at:now,end_reason:reason,contact_released_at:null,updated_at:now}).eq("id",matchId);await admin.from("futurelink_profiles").update({status:"searching_for_match",updated_at:now}).in("user_id",[match.mentee_id,match.mentor_id]);for(const id of [match.mentee_id,match.mentor_id])await queueFutureLinkEmail({userId:id,templateKey:"futurelink_match_ended",idempotencyKey:`futurelink-ended:${matchId}:${id}`,payload:{message:"This mentorship match has ended. Eligible participants are safely returned to the matching pool; private contact information is no longer displayed.",application_path:"/future-link/dashboard"}});await admin.from("audit_events").insert({actor_id:user.id,action:"futurelink_rematch_requested",target_type:"futurelink_match",target_id:matchId,metadata_safe:{reason_present:Boolean(reason)}});await runFutureLinkMatching(10);revalidatePath("/future-link/dashboard");}

export async function reportFutureLinkSafety(form:FormData){const {supabase}=await currentUser();const matchId=text(form,"matchId",50);const category=text(form,"category",100);const details=text(form,"details",4000);if(!category||details.length<10)redirect("/future-link/dashboard?error=Please%20include%20enough%20detail%20for%20the%20safety%20team");const {data,error}=await supabase.rpc("futurelink_report_match",{p_match:matchId,p_category:category,p_details:details,p_block:true});if(error)redirect("/future-link/dashboard?error=Safety%20report%20could%20not%20be%20submitted");await createAdminClient().from("messages").upsert({recipient:"nationals@estherfundsinc.org",idempotency_key:`futurelink-safety:${data}`,status:"queued",template_key:"futurelink_safety_alert",payload_private:{name:"National Office",message:"A FutureLink safety report requires protected staff review. Do not reply with case details by email.",application_path:"/future-link/admin"},next_attempt_at:new Date().toISOString()},{onConflict:"idempotency_key",ignoreDuplicates:true});redirect("/future-link/dashboard?reported=1");}

export async function futureLinkAdminDecision(form:FormData){const {user}=await requireAdmin();const admin=createAdminClient();const userId=text(form,"userId",50);const decision=text(form,"decision",30);const note=text(form,"note",1000);const now=new Date().toISOString();if(decision==="approve")await admin.from("futurelink_profiles").update({verification_status:"approved",status:"approved",verified_at:now,verified_by:user.id,review_note:note||null,updated_at:now}).eq("user_id",userId);else if(decision==="request")await admin.from("futurelink_profiles").update({verification_status:"additional_documents_required",status:"additional_documents_required",review_note:note||"Additional verification is required.",updated_at:now}).eq("user_id",userId);else if(decision==="reject")await admin.from("futurelink_profiles").update({verification_status:"rejected",status:"suspended",review_note:note||"Verification could not be approved.",updated_at:now}).eq("user_id",userId);else return;await admin.from("audit_events").insert({actor_id:user.id,action:`futurelink_verification_${decision}`,target_type:"futurelink_profile",target_id:userId,metadata_safe:{note_present:Boolean(note)}});await queueFutureLinkEmail({userId,templateKey:decision==="approve"?"futurelink_verified":"futurelink_verification_update",idempotencyKey:`futurelink-verification:${userId}:${decision}:${Date.now()}`,payload:{message:note,application_path:"/future-link/dashboard"}});revalidatePath("/future-link/admin");}

export async function futureLinkAdminManualMatch(form:FormData){
  const {user}=await requireAdmin();const admin=createAdminClient();const menteeId=text(form,"menteeId",50),mentorId=text(form,"mentorId",50);
  if(!menteeId||!mentorId||menteeId===mentorId)redirect("/future-link/admin?error=Choose%20one%20mentee%20and%20one%20mentor");
  const {data:profiles}=await admin.from("futurelink_profiles").select("user_id,display_name,participant_type,status,school,degree_level,academic_field,career_fields,industries,support_needed,support_offered,experience_tags,timezone,meeting_format,communication_styles,meeting_cadence,availability,mentor_capacity").in("user_id",[menteeId,mentorId]).eq("verification_status","approved");
  const mentee=(profiles??[]).find(p=>p.user_id===menteeId) as FutureLinkProfile|undefined,mentor=(profiles??[]).find(p=>p.user_id===mentorId) as FutureLinkProfile|undefined;
  if(!mentee||!mentor||!["student_mentee","student_both"].includes(mentee.participant_type)||!["student_peer_mentor","student_both","professional_mentor"].includes(mentor.participant_type))redirect("/future-link/admin?error=Both%20profiles%20must%20be%20verified%20and%20eligible");
  const {count}=await admin.from("futurelink_matches").select("id",{count:"exact",head:true}).eq("mentor_id",mentorId).in("status",["proposed","awaiting_mentor_acceptance","awaiting_mentee_acceptance","agreement_required","active"]);
  if((count??0)>=(mentor.mentor_capacity??1))redirect("/future-link/admin?error=That%20mentor%20is%20already%20at%20capacity");
  const scored=scoreFutureLinkMatch(mentee,mentor);const reasons=[...scored.reasons,"National Office reviewed this connection"];
  const {data:matchId,error}=await admin.rpc("futurelink_create_match",{p_mentee:menteeId,p_mentor:mentorId,p_score:scored.score,p_reasons:reasons});
  if(error||!matchId)redirect("/future-link/admin?error=The%20match%20could%20not%20be%20created.%20Check%20current%20match%20status.");
  for(const recipient of [{id:menteeId,name:mentee.display_name,other:mentor.display_name},{id:mentorId,name:mentor.display_name,other:mentee.display_name}])await queueFutureLinkEmail({userId:recipient.id,templateKey:"futurelink_match_proposed",idempotencyKey:`futurelink-match:${matchId}:${recipient.id}`,payload:{other_name:recipient.other,match_score:scored.score,match_reasons:reasons,application_path:"/future-link/dashboard"}});
  await admin.from("audit_events").insert({actor_id:user.id,action:"futurelink_match_manually_proposed",target_type:"futurelink_match",target_id:String(matchId),metadata_safe:{score:scored.score,reason_count:reasons.length}});revalidatePath("/future-link/admin");redirect("/future-link/admin?matched=1");
}
