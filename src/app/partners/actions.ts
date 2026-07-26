"use server";

import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";

const text=(formData:FormData,key:string,max=500)=>
  String(formData.get(key)??"").trim().slice(0,max);

const slugify=(value:string)=>
  value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,72);

function isWebUrl(value:string){
  if(!value)return true;
  try{const url=new URL(value);return url.protocol==="https:"||url.protocol==="http:";}catch{return false;}
}

async function requireUser(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/sign-in?next=%2Fpartners%2Fonboarding");
  return user;
}

export async function submitPartnerApplication(formData:FormData){
  const user=await requireUser();
  const admin=createAdminClient();
  let displayName=text(formData,"schoolName",180);
  let legalName=text(formData,"legalName",180)||displayName;
  const primaryContactName=text(formData,"primaryContactName",120);
  const primaryContactTitle=text(formData,"primaryContactTitle",120);
  const primaryContactEmail=text(formData,"primaryContactEmail",254).toLowerCase();
  const liaisonDepartment=text(formData,"liaisonDepartment",160);
  const websiteUrl=text(formData,"websiteUrl",500);
  const logoUrl=text(formData,"logoUrl",500);
  const publicSummary=text(formData,"publicSummary",900);
  const unitidRaw=text(formData,"collegeUnitid",20);
  const collegeUnitid=unitidRaw?Number(unitidRaw):null;
  let directoryCity=text(formData,"city",100)||null;
  let directoryState=text(formData,"schoolState",2)||null;
  let directoryType=text(formData,"schoolType",100)||"U.S. college or university";
  if(Number.isInteger(collegeUnitid)){
    const {data:school}=await admin.from("college_directory")
      .select("name,city,state,hbcu").eq("unitid",collegeUnitid).maybeSingle();
    if(school){
      displayName=school.name;
      legalName=school.name;
      directoryCity=school.city;
      directoryState=school.state;
      directoryType=school.hbcu?"HBCU":"U.S. college or university";
    }
  }
  const commitments=["acceptsEffReferrals","preStopoutReview","writtenResolutionPath","coordinatesWithEff","sharesOutcomes"];
  const missingCommitment=commitments.some(key=>formData.get(key)!=="on");
  if(
    displayName.length<2||legalName.length<2||primaryContactName.length<2||
    primaryContactTitle.length<2||!primaryContactEmail.includes("@")||
    liaisonDepartment.length<2||missingCommitment||!isWebUrl(websiteUrl)||!isWebUrl(logoUrl)
  )redirect(`/partners/onboarding?error=${encodeURIComponent("Complete all required fields, confirm every partnership commitment, and use valid website links.")}`);

  const {data:existing}=await admin.from("eff_partner_members")
    .select("institution_id").eq("user_id",user.id).maybeSingle();
  if(existing?.institution_id)redirect("/partners/dashboard");

  const base=slugify(displayName)||"partner-school";
  let slug=base;
  for(let attempt=0;attempt<20;attempt++){
    const {count}=await admin.from("eff_partner_institutions")
      .select("id",{count:"exact",head:true}).eq("slug",slug);
    if(!count)break;
    slug=`${base}-${attempt+2}`;
  }

  const {data:institution,error}=await admin.from("eff_partner_institutions").insert({
    college_unitid:Number.isInteger(collegeUnitid)?collegeUnitid:null,
    slug,
    legal_name:legalName,
    display_name:displayName,
    institution_type:directoryType,
    city:directoryCity,
    state:directoryState,
    website_url:websiteUrl||null,
    logo_url:logoUrl||null,
    public_summary:publicSummary||null,
    primary_contact_name:primaryContactName,
    primary_contact_title:primaryContactTitle,
    primary_contact_email:primaryContactEmail,
    primary_contact_phone:text(formData,"primaryContactPhone",40)||null,
    liaison_department:liaisonDepartment,
    status:"active",
    public_profile:true,
    approved_at:new Date().toISOString(),
    reviewed_at:new Date().toISOString(),
    application_note:text(formData,"applicationNote",1800)||null,
    created_by:user.id
  }).select("id").single();
  if(error||!institution)redirect(`/partners/onboarding?error=${encodeURIComponent("We could not save this partnership application. Please try again or contact the national office.")}`);

  const {error:memberError}=await admin.from("eff_partner_members").insert({
    institution_id:institution.id,user_id:user.id,member_role:"owner"
  });
  if(memberError){
    await admin.from("eff_partner_institutions").delete().eq("id",institution.id);
    redirect(`/partners/onboarding?error=${encodeURIComponent("We could not connect the institution account. Please try again.")}`);
  }
  await admin.from("eff_partner_activity").insert({
    institution_id:institution.id,actor_id:user.id,action:"partnership_activated",
    detail_safe:{source:"public_partner_portal",activation:"automatic_by_eff_policy"}
  });
  redirect("/partners/dashboard?submitted=1");
}

export async function updatePartnerProfile(formData:FormData){
  const user=await requireUser();
  const admin=createAdminClient();
  const institutionId=text(formData,"institutionId",50);
  const {data:membership}=await admin.from("eff_partner_members").select("member_role")
    .eq("institution_id",institutionId).eq("user_id",user.id).maybeSingle();
  if(!membership||!["owner","administrator"].includes(membership.member_role))
    redirect("/partners/dashboard?error=You+do+not+have+permission+to+update+that+profile.");
  const websiteUrl=text(formData,"websiteUrl",500);
  const logoUrl=text(formData,"logoUrl",500);
  if(!isWebUrl(websiteUrl)||!isWebUrl(logoUrl))
    redirect("/partners/dashboard?error=Use+a+valid+website+or+logo+URL.");
  const {error}=await admin.from("eff_partner_institutions").update({
    website_url:websiteUrl||null,
    logo_url:logoUrl||null,
    public_summary:text(formData,"publicSummary",900)||null,
    primary_contact_name:text(formData,"primaryContactName",120),
    primary_contact_title:text(formData,"primaryContactTitle",120),
    primary_contact_phone:text(formData,"primaryContactPhone",40)||null,
    liaison_department:text(formData,"liaisonDepartment",160),
    updated_at:new Date().toISOString()
  }).eq("id",institutionId);
  if(error)redirect("/partners/dashboard?error=The+profile+could+not+be+updated.");
  await admin.from("eff_partner_activity").insert({
    institution_id:institutionId,actor_id:user.id,action:"partner_profile_updated"
  });
  revalidatePath("/partners/dashboard");
  redirect("/partners/dashboard?saved=1");
}
