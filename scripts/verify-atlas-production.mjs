import {createClient} from "@supabase/supabase-js";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error("Production database configuration is unavailable.");
const db=createClient(url,key,{auth:{persistSession:false}}),today=new Date().toISOString().slice(0,10);
const results=await Promise.all([
 db.from("external_scholarships").select("id",{count:"exact",head:true}).not("published_at","is",null).is("archived_at",null),
 db.from("external_scholarships").select("id",{count:"exact",head:true}).eq("verification_status","verified_current").not("published_at","is",null).is("archived_at",null).or(`deadline.gte.${today},deadline.is.null`),
 db.from("external_scholarships").select("id",{count:"exact",head:true}).in("verification_status",["needs_verification","needs_recheck"]).is("archived_at",null),
 db.from("student_resource_sources").select("id",{count:"exact",head:true}),
 db.from("student_match_profiles").select("user_id",{count:"exact",head:true}),
 db.from("messages").select("id",{count:"exact",head:true}).eq("template_key","weekly_scholarship_matches")
]);
const failure=results.find(result=>result.error);if(failure?.error)throw new Error(failure.error.message);
console.log(JSON.stringify({published:results[0].count,currentVerified:results[1].count,awaitingVerification:results[2].count,verifiedResources:results[3].count,matchProfiles:results[4].count,weeklyDigestMessages:results[5].count}));
