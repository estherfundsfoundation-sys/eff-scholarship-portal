"use server";
import{redirect}from"next/navigation";import{createClient}from"@/lib/supabase/server";
const text=(f:FormData,k:string,n=180)=>String(f.get(k)??"").trim().slice(0,n)||null;
const list=(f:FormData,k:string)=>f.getAll(k).map(String).map(v=>v.trim().toLowerCase()).filter(Boolean).slice(0,25);
export async function saveMatchProfile(formData:FormData){
 const db=await createClient();const{data:{user}}=await db.auth.getUser();if(!user)redirect("/sign-in?next=/scholarships/match");
 const graduationRaw=Number(text(formData,"graduationYear",4));const graduationYear=Number.isInteger(graduationRaw)&&graduationRaw>=2020&&graduationRaw<=2100?graduationRaw:null;
 const payload={user_id:user.id,academic_level:text(formData,"academicLevel",60),graduation_year:graduationYear,fields_of_study:list(formData,"fieldsOfStudy"),state_code:text(formData,"stateCode",3)?.toUpperCase()??null,country_code:text(formData,"countryCode",3)?.toUpperCase()??"US",institution_name:text(formData,"institutionName",180),gpa_band:text(formData,"gpaBand",30),enrollment_type:text(formData,"enrollmentType",40),citizenship_categories:list(formData,"citizenshipCategories"),identity_tags:list(formData,"identityTags"),affiliation_tags:list(formData,"affiliationTags"),support_needs:list(formData,"supportNeeds"),weekly_matches:formData.get("weeklyMatches")==="on",quiz_completed_at:new Date().toISOString(),updated_at:new Date().toISOString()};
 const{error}=await db.from("student_match_profiles").upsert(payload,{onConflict:"user_id"});if(error)redirect(`/scholarships/match?error=${encodeURIComponent("Your answers could not be saved. Please try again.")}`);redirect("/scholarships/matches?updated=1");
}
