"use server";

import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {queueBeyondEmail} from "@/lib/beyond-email";
import {beyondConnectionGoals,beyondInterests,beyondStages} from "@/lib/beyond";

const text=(form:FormData,key:string,max=1000)=>String(form.get(key)??"").trim().slice(0,max);
const values=(form:FormData,key:string,allowed:readonly string[])=>form.getAll(key).map(String).filter(value=>allowed.includes(value)).slice(0,12);

async function signedInUser(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/sign-in?next=/onboarding");
  return user;
}

export async function saveBeyondProfile(form:FormData){
  const user=await signedInUser();
  const admin=createAdminClient();
  const displayName=text(form,"displayName",80);
  const stage=text(form,"stage",60);
  const city=text(form,"city",100);
  const state=text(form,"state",80);
  const almaMater=text(form,"almaMater",180);
  const graduationYear=Number(text(form,"graduationYear",4));
  const interests=values(form,"interests",beyondInterests);
  const connectionGoals=values(form,"connectionGoals",beyondConnectionGoals);
  if(!displayName||!beyondStages.includes(stage as typeof beyondStages[number])||!city||!state||!almaMater||graduationYear<1950||graduationYear>2100||interests.length<2||connectionGoals.length<1){
    redirect(`/onboarding?error=${encodeURIComponent("Complete the required profile fields and choose at least two interests.")}`);
  }
  if(form.get("communityPledge")!=="yes"||form.get("privacyPledge")!=="yes")redirect(`/onboarding?error=${encodeURIComponent("Accept the community and privacy commitments to continue.")}`);
  const now=new Date().toISOString();
  const record={
    user_id:user.id,display_name:displayName,stage,city,state,alma_mater:almaMater,graduation_year:graduationYear,
    industry:text(form,"industry",120)||null,role_title:text(form,"roleTitle",140)||null,interests,
    faith_interest:text(form,"faithInterest",30)==="yes",career_goals:text(form,"careerGoals",1200)||null,
    navigating_now:text(form,"navigatingNow",1200)||null,support_seeking:text(form,"supportSeeking",1200)||null,
    can_help_with:text(form,"canHelpWith",1200)||null,connection_goals:connectionGoals,
    directory_visible:text(form,"directoryVisible",10)==="yes",community_pledge_at:now,privacy_pledge_at:now,
    onboarding_completed_at:now,updated_at:now,
  };
  const {error}=await admin.from("beyond_profiles").upsert(record,{onConflict:"user_id"});
  if(error){console.error("Beyond profile save failed",error);redirect(`/onboarding?error=${encodeURIComponent("We could not save your profile. Please try again.")}`);}
  const chosen:string[]=[];
  if(connectionGoals.includes("Join faith community"))chosen.push("faith-and-work");
  if(connectionGoals.includes("Meet people in my city"))chosen.push("new-to-the-city");
  if(stage==="Career transition")chosen.push("career-pivot");
  if(interests.includes("Mentorship"))chosen.push("first-gen-beyond");
  if(chosen.length){
    const {data:circles}=await admin.from("beyond_circles").select("id,slug").in("slug",[...new Set(chosen)]);
    if(circles?.length)await admin.from("beyond_circle_members").upsert(circles.map(circle=>({circle_id:circle.id,user_id:user.id,role:"member"})),{onConflict:"circle_id,user_id",ignoreDuplicates:true});
  }
  await admin.from("audit_events").insert({actor_id:user.id,action:"beyond_profile_completed",target_type:"beyond_profile",target_id:user.id,metadata_safe:{stage,graduation_year:graduationYear}});
  await queueBeyondEmail({userId:user.id,templateKey:"beyond_welcome",idempotencyKey:`beyond-welcome:${user.id}`,payload:{application_path:"/dashboard"}});
  redirect("/dashboard?welcome=1");
}

export async function toggleBeyondCircle(form:FormData){
  const user=await signedInUser();
  const slug=text(form,"slug",80);
  const admin=createAdminClient();
  const {data:circle}=await admin.from("beyond_circles").select("id").eq("slug",slug).eq("active",true).maybeSingle();
  if(!circle)redirect("/dashboard?error=Circle%20not%20found");
  const {data:existing}=await admin.from("beyond_circle_members").select("circle_id").eq("circle_id",circle.id).eq("user_id",user.id).maybeSingle();
  if(existing)await admin.from("beyond_circle_members").delete().eq("circle_id",circle.id).eq("user_id",user.id);
  else await admin.from("beyond_circle_members").insert({circle_id:circle.id,user_id:user.id,role:"member"});
  revalidatePath("/beyond/dashboard");
  redirect("/dashboard");
}
