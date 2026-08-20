import {NextRequest,NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {rankScholarships,type ScholarshipForMatch} from "@/lib/scholarship-matching";

const blocked=/^(test|example|no-?reply|donotreply)[+@]/i;
const resourceCategory:Record<string,string>={tuition:"financial_aid",books:"basic_needs",housing:"housing",food:"food",transportation:"transportation",childcare:"childcare",technology:"technology"};

export async function GET(request:NextRequest){
 if(!process.env.CRON_SECRET||request.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:"Unauthorized"},{status:401});
 const db=createAdminClient(),cutoff=new Date(Date.now()-6.5*86400000).toISOString(),today=new Date().toISOString().slice(0,10);
 const[{data:matchProfiles,error:profileError},{data:scholarships,error:scholarshipError},{data:resources,error:resourceError}]=await Promise.all([
  db.from("student_match_profiles").select("*").eq("weekly_matches",true).or(`last_digest_queued_at.is.null,last_digest_queued_at.lt.${cutoff}`).order("last_digest_queued_at",{ascending:true,nullsFirst:true}).limit(50),
  db.from("external_scholarships").select("id,slug,title,sponsor,summary,amount_text,amount_numeric,deadline_kind,deadline,eligibility").eq("verification_status","verified_current").not("published_at","is",null).is("archived_at",null).or(`deadline.gte.${today},deadline.is.null`).limit(5000),
  db.from("student_resource_sources").select("id,title,category,official_url,source_type,state_code").is("archived_at",null).in("availability_status",["verified_open","seasonal"]).limit(500)
 ]);
 if(profileError||scholarshipError||resourceError)return NextResponse.json({error:"Digest data unavailable"},{status:500});
 let queued=0,skipped=0;const week=today;
 for(const profile of matchProfiles??[]){
  const{data:user}=await db.from("profiles").select("primary_email,legal_name,preferred_name").eq("id",profile.user_id).maybeSingle();
  const recipient=String(user?.primary_email??"").trim().toLowerCase();
  if(!recipient||blocked.test(recipient)){skipped++;continue;}
  const{data:suppressed}=await db.from("email_suppressions").select("email").eq("email",recipient).maybeSingle();if(suppressed){skipped++;continue;}
  const matches=rankScholarships(profile,(scholarships??[])as ScholarshipForMatch[],10);
  if(!matches.length){await db.from("student_match_profiles").update({last_digest_queued_at:new Date().toISOString()}).eq("user_id",profile.user_id);skipped++;continue;}
  const wanted=new Set((profile.support_needs??[]).map((need:string)=>resourceCategory[need]??need));
  const resourceMatches=(resources??[]).filter(item=>(item.source_type==="national"||!item.state_code||item.state_code===profile.state_code)&&wanted.has(item.category)).slice(0,4);
  const payload={name:user?.preferred_name||user?.legal_name||"Student",matches:matches.map(item=>({title:item.scholarship.title,path:`/scholarships/${item.scholarship.slug}`,amount:item.scholarship.amount_text,deadline:item.scholarship.deadline,reasons:item.reasons})),resources:resourceMatches.map(item=>({title:item.title,url:item.official_url,category:item.category}))};
  const{data,error}=await db.from("messages").upsert({recipient,idempotency_key:`weekly-scholarship-matches:${profile.user_id}:${week}`,status:"queued",payload_private:payload,template_key:"weekly_scholarship_matches",next_attempt_at:new Date().toISOString()},{onConflict:"idempotency_key",ignoreDuplicates:true}).select("id").maybeSingle();
  if(error){skipped++;continue;}await db.from("student_match_profiles").update({last_digest_queued_at:new Date().toISOString()}).eq("user_id",profile.user_id);if(data)queued++;else skipped++;
 }
 return NextResponse.json({examined:matchProfiles?.length??0,queued,skipped});
}
export const maxDuration=60;
