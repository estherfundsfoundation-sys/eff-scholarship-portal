import "server-only";
import {createAdminClient} from "@/lib/supabase/admin";
import {scoreFutureLinkMatch,type FutureLinkProfile} from "@/lib/futurelink";

export async function runFutureLinkMatching(limit=50){
  const admin=createAdminClient();
  const {data,error}=await admin.from("futurelink_profiles").select("user_id,display_name,participant_type,status,school,degree_level,academic_field,career_fields,industries,support_needed,support_offered,experience_tags,timezone,meeting_format,communication_styles,meeting_cadence,availability,mentor_capacity").in("status",["match_eligible","searching_for_match"]).eq("verification_status","approved");
  if(error)throw error;
  const profiles=(data??[]) as FutureLinkProfile[];
  const mentees=profiles.filter(p=>["student_mentee","student_both"].includes(p.participant_type));
  const mentors=profiles.filter(p=>["student_peer_mentor","student_both","professional_mentor"].includes(p.participant_type));
  const activeCounts=new Map<string,number>();
  const {data:active}=await admin.from("futurelink_matches").select("mentor_id").in("status",["proposed","awaiting_mentor_acceptance","awaiting_mentee_acceptance","agreement_required","active"]);
  for(const row of active??[])activeCounts.set(row.mentor_id,(activeCounts.get(row.mentor_id)??0)+1);
  const candidates=mentees.flatMap(mentee=>mentors.filter(mentor=>mentor.user_id!==mentee.user_id&&(activeCounts.get(mentor.user_id)??0)<(mentor.mentor_capacity??1)).map(mentor=>({mentee,mentor,...scoreFutureLinkMatch(mentee,mentor)}))).filter(item=>item.score>=45).sort((a,b)=>b.score-a.score);
  const usedMentees=new Set<string>();let created=0;
  for(const candidate of candidates){
    if(created>=limit||usedMentees.has(candidate.mentee.user_id))continue;
    if((activeCounts.get(candidate.mentor.user_id)??0)>=(candidate.mentor.mentor_capacity??1))continue;
    const {data:matchId,error:matchError}=await admin.rpc("futurelink_create_match",{p_mentee:candidate.mentee.user_id,p_mentor:candidate.mentor.user_id,p_score:candidate.score,p_reasons:candidate.reasons});
    if(matchError||!matchId)continue;
    const recipients=[
      {id:candidate.mentee.user_id,name:candidate.mentee.display_name,other:candidate.mentor.display_name},
      {id:candidate.mentor.user_id,name:candidate.mentor.display_name,other:candidate.mentee.display_name},
    ];
    for(const recipient of recipients){
      const {data:profile}=await admin.from("profiles").select("primary_email").eq("id",recipient.id).maybeSingle();
      if(profile?.primary_email)await admin.from("messages").upsert({recipient:profile.primary_email,idempotency_key:`futurelink-match:${matchId}:${recipient.id}`,status:"queued",template_key:"futurelink_match_proposed",payload_private:{name:recipient.name,other_name:recipient.other,match_score:candidate.score,match_reasons:candidate.reasons,application_path:"/future-link/dashboard"},next_attempt_at:new Date().toISOString()},{onConflict:"idempotency_key",ignoreDuplicates:true});
    }
    usedMentees.add(candidate.mentee.user_id);activeCounts.set(candidate.mentor.user_id,(activeCounts.get(candidate.mentor.user_id)??0)+1);created++;
  }
  return {created,eligibleMentees:mentees.length,eligibleMentors:mentors.length};
}
