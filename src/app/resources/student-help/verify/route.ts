import {createHash} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {buildAutomaticStudentRouting,contactKeysForIssue,type SchoolContact} from "@/lib/student-help-routing";
import {createHelpDeskToken,hashHelpDeskToken} from "@/lib/help-desk/tokens";
import {sendLeadershipAlert,sendSecureCaseNotification,sendVolunteerQueueNotification} from "@/lib/help-desk/email";
import {classifyHelpDeskMessage,SAFETY_RESPONSE} from "@/lib/help-desk/safety";

export async function GET(request:NextRequest){
  const token=request.nextUrl.searchParams.get("token");
  if(!token)return NextResponse.redirect(new URL("/resources/student-help?error=This verification link is invalid.",request.url));
  const admin=createAdminClient();const tokenHash=createHash("sha256").update(token).digest("hex");
  const {data:record}=await admin.from("student_help_cases").select("id,case_code,student_name,preferred_name,email,college_unitid,school_name,issue_type,urgency,school_deadline,situation_summary,steps_taken,essentials_requested,essentials_term,verified_at,verification_expires_at").eq("verification_token_hash",tokenHash).maybeSingle();
  if(!record)return NextResponse.redirect(new URL("/resources/student-help?error=This verification link is invalid or has already been replaced.",request.url));
  if(!record.verified_at&&(!record.verification_expires_at||new Date(record.verification_expires_at)<new Date()))return NextResponse.redirect(new URL("/resources/student-help?error=This verification link expired. Please open a new case.",request.url));

  const now=new Date();
  const intakeClassification=classifyHelpDeskMessage(`${record.situation_summary}\n${record.steps_taken}`);
  const accessToken=createHelpDeskToken(record.id);
  const accessTokenHash=hashHelpDeskToken(accessToken);
  if(record.verified_at){
    const {data:existing}=await admin.from("help_desk_conversations").select("id").eq("case_id",record.id).maybeSingle();
    if(existing)return NextResponse.redirect(new URL(`/help-desk/case/${encodeURIComponent(record.case_code)}?token=${encodeURIComponent(accessToken)}`,request.url));
  }

  const needsEffReview=intakeClassification.safety||Boolean(record.essentials_requested)||record.urgency.includes("72 hours")||!record.college_unitid;
  const next=new Date(now.getTime()+3*24*60*60*1000).toISOString();
  const updated=await admin.from("student_help_cases").update({verified_at:record.verified_at??now.toISOString(),status:needsEffReview?"new":"referred_to_school",next_follow_up_at:next,verification_token_hash:null,secure_access_issued_at:now.toISOString(),updated_at:now.toISOString()}).eq("id",record.id);
  if(updated.error)return NextResponse.redirect(new URL("/resources/student-help?error=We could not verify your case. Please try the link again.",request.url));

  const [{data:school},{data:contactRows}]=await Promise.all([
    record.college_unitid?admin.from("college_directory").select("website,admissions_url,financial_aid_url,accessibility_url,veterans_url").eq("unitid",record.college_unitid).maybeSingle():Promise.resolve({data:null}),
    record.college_unitid?admin.from("college_contact_directory").select("department_key,department_name,contact_url,email,phone,source_url").eq("unitid",record.college_unitid).in("department_key",contactKeysForIssue(record.issue_type)).in("verification_status",["source_listed","verified"]):Promise.resolve({data:[]})
  ]);
  const routing=buildAutomaticStudentRouting(record,(contactRows??[]) as SchoolContact[],school??{});
  const {data:conversation,error:conversationError}=await admin.from("help_desk_conversations").upsert({
    case_id:record.id,access_token_hash:accessTokenHash,status:intakeClassification.safety?"safety_locked":"unassigned",risk_level:intakeClassification.safety?"safety":record.urgency.includes("72 hours")?"urgent":"routine",last_message_at:now.toISOString(),updated_at:now.toISOString()
  },{onConflict:"case_id"}).select("id").single();
  if(conversationError||!conversation)return NextResponse.redirect(new URL("/resources/student-help?error=Your case was verified but secure messaging could not be opened. Please try again.",request.url));

  const {count}=await admin.from("help_desk_messages").select("id",{count:"exact",head:true}).eq("conversation_id",conversation.id);
  if(!count){
    await admin.from("help_desk_messages").insert([
      {conversation_id:conversation.id,sender_type:"system",body:"Welcome to your secure EFF National Help Desk case. A trained volunteer may respond when available. You may leave a message here at any time. Email alerts will never include your private story.\n\nEFF volunteers provide resource navigation and advocacy preparation. They are not therapists, attorneys, financial-aid administrators, or funding decisionmakers. EFF cannot promise funding or a school outcome."},
      {conversation_id:conversation.id,sender_type:"system",body:`Your automatic starting plan:\n\n${routing}`}
    ]);
  }
  if(intakeClassification.safety){await admin.from("help_desk_messages").insert({conversation_id:conversation.id,sender_type:"system",body:SAFETY_RESPONSE,safety_flag:true});await admin.from("help_desk_escalations").insert({conversation_id:conversation.id,escalation_type:"safety",severity:"immediate",summary:intakeClassification.reasons.join(", ")});}
  await admin.from("student_help_case_events").insert({case_id:record.id,event_type:"secure_help_desk_opened",summary:needsEffReview?"Student verified; secure conversation opened and leadership exception review triggered.":"Student verified; secure conversation and automatic resource plan opened."});

  try{await sendSecureCaseNotification(record.email,record.case_code,accessToken,`Your secure EFF Help Desk case is ready â€” ${record.case_code}`);}catch(error){console.error("Secure case notification failed",error);}
  if(needsEffReview){try{await sendLeadershipAlert(record.case_code,"Verified case needs authorized review because of an immediate deadline, unmatched school, or funding request.");}catch(error){console.error("Leadership verification alert failed",error);}}
  const {data:volunteers}=await admin.from("help_desk_volunteer_profiles").select("user_id,notification_email").eq("status","certified").eq("email_notifications",true).limit(50);
  for(const volunteer of volunteers??[]){try{await sendVolunteerQueueNotification(volunteer.notification_email);await admin.from("help_desk_volunteer_profiles").update({last_notified_at:now.toISOString()}).eq("user_id",volunteer.user_id);}catch(error){console.error("Volunteer opening notification failed",error);}}
  return NextResponse.redirect(new URL(`/help-desk/case/${encodeURIComponent(record.case_code)}?token=${encodeURIComponent(accessToken)}`,request.url));
}
