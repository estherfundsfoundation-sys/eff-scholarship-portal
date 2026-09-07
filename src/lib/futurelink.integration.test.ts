import {afterAll,beforeAll,describe,expect,it} from "vitest";
import {createClient} from "@supabase/supabase-js";
import {scoreFutureLinkMatch,type FutureLinkProfile} from "./futurelink";

const enabled=process.env.RUN_FUTURELINK_INTEGRATION==="1";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL??"";
const key=process.env.SUPABASE_SERVICE_ROLE_KEY??"";
const admin=createClient(url||"http://127.0.0.1:54321",key||"test-key",{auth:{persistSession:false,autoRefreshToken:false}});
const runId=`${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
const menteeEmail=`futurelink-e2e-mentee-${runId}@example.com`;
const mentorEmail=`futurelink-e2e-mentor-${runId}@example.com`;
let menteeId="",mentorId="",matchId="";

(enabled?describe:describe.skip)("FutureLink production lifecycle",()=>{
  beforeAll(async()=>{
    if(!url||!key)throw new Error("Production Supabase environment is required for this opt-in test.");
    const makeUser=async(email:string,name:string)=>{
      const {data,error}=await admin.auth.admin.createUser({email,email_confirm:true,user_metadata:{legal_name:name,preferred_name:name}});
      if(error||!data.user)throw error??new Error("Test user could not be created");return data.user.id;
    };
    menteeId=await makeUser(menteeEmail,"ZZ FutureLink Test Mentee");mentorId=await makeUser(mentorEmail,"ZZ FutureLink Test Mentor");
    const common={status:"searching_for_match",verification_status:"approved",date_of_birth:"2000-01-01",degree_level:"Undergraduate",academic_field:"Education",career_fields:["Education & Student Affairs"],industries:["Education & Student Affairs"],experience_tags:["First-generation student"],timezone:"Eastern",meeting_format:"Virtual",communication_styles:["Video call","Email"],meeting_cadence:"Every other week",availability:["Weekday evenings"],mentor_capacity:1,approved_contact_methods:["Email"],code_version:"2026.09",code_accepted_at:new Date().toISOString(),accuracy_confirmed:true,adult_confirmed:true,privacy_confirmed:true,submitted_at:new Date().toISOString(),verified_at:new Date().toISOString(),orientation_completed_at:new Date().toISOString(),readiness_acknowledged_at:new Date().toISOString()};
    const {error}=await admin.from("futurelink_profiles").insert([
      {...common,user_id:menteeId,participant_type:"student_mentee",legal_name:"ZZ FutureLink Test Mentee",display_name:"Test Mentee",school:"EFF Test University",support_needed:["Career exploration","Leadership development"],support_offered:[]},
      {...common,user_id:mentorId,participant_type:"professional_mentor",legal_name:"ZZ FutureLink Test Mentor",display_name:"Test Mentor",profession:"Education Leader",support_needed:[],support_offered:["Career exploration","Leadership development"]}
    ]);if(error)throw error;
  },30000);

  afterAll(async()=>{
    if(matchId)await admin.from("futurelink_matches").delete().eq("id",matchId);
    await admin.from("messages").delete().in("recipient",[menteeEmail,mentorEmail]);
    if(menteeId)await admin.auth.admin.deleteUser(menteeId);if(mentorId)await admin.auth.admin.deleteUser(mentorId);
  },30000);

  it("automatically scores, proposes, queues notifications, and stores program operations",async()=>{
    const {data:candidates,error:candidateError}=await admin.from("futurelink_profiles").select("user_id,display_name,participant_type,status,school,degree_level,academic_field,career_fields,industries,support_needed,support_offered,experience_tags,timezone,meeting_format,communication_styles,meeting_cadence,availability,mentor_capacity").in("user_id",[menteeId,mentorId]);if(candidateError)throw candidateError;
    const mentee=candidates!.find(row=>row.user_id===menteeId) as FutureLinkProfile,mentor=candidates!.find(row=>row.user_id===mentorId) as FutureLinkProfile;const scored=scoreFutureLinkMatch(mentee,mentor);expect(scored.score).toBeGreaterThanOrEqual(45);
    const proposed=await admin.rpc("futurelink_create_match",{p_mentee:menteeId,p_mentor:mentorId,p_score:scored.score,p_reasons:scored.reasons});if(proposed.error||!proposed.data)throw proposed.error??new Error("Matcher RPC did not create a proposal");matchId=proposed.data;
    for(const [recipient,userId,other] of [[menteeEmail,menteeId,"Test Mentor"],[mentorEmail,mentorId,"Test Mentee"]]){const {error:messageError}=await admin.from("messages").insert({recipient,idempotency_key:`futurelink-e2e:${runId}:${userId}`,status:"queued",template_key:"futurelink_match_proposed",payload_private:{name:"FutureLink test",other_name:other,match_score:scored.score,match_reasons:scored.reasons,application_path:"/future-link/dashboard"},next_attempt_at:new Date().toISOString()});if(messageError)throw messageError;}
    const {data:match,error}=await admin.from("futurelink_matches").select("id,status,score,reasons").eq("mentee_id",menteeId).eq("mentor_id",mentorId).single();
    if(error)throw error;matchId=match.id;expect(match.status).toBe("proposed");expect(match.score).toBeGreaterThanOrEqual(45);expect(match.reasons.length).toBeGreaterThan(0);
    const {count}=await admin.from("messages").select("id",{count:"exact",head:true}).in("recipient",[menteeEmail,mentorEmail]).eq("template_key","futurelink_match_proposed");expect(count).toBe(2);
    await admin.from("futurelink_matches").update({status:"active",contact_released_at:new Date().toISOString()}).eq("id",matchId);
    const {error:planError}=await admin.from("futurelink_meeting_plans").insert({match_id:matchId,cadence:"Every other week",weekday:"Thursday",local_time:"18:30",timezone:"Eastern",zoom_url_private:"https://zoom.us/j/123456789",next_meeting_at:new Date(Date.now()+86400000).toISOString(),updated_by:mentorId});expect(planError).toBeNull();
    const {data:session,error:sessionError}=await admin.from("futurelink_sessions").insert({match_id:matchId,mentor_id:mentorId,mentee_id:menteeId,session_date:new Date().toISOString().slice(0,10),duration_minutes:45,format:"Virtual",category:"Career planning"}).select("id,status").single();expect(sessionError).toBeNull();expect(session?.status).toBe("pending_mentee_confirmation");
  },30000);
});
