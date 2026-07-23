import Link from "next/link";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";

async function saveCareerProfile(formData:FormData){
  "use server";
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/sign-in?next=/careers/profile");
  const legalName=String(formData.get("legalName")??"").trim();
  const phone=String(formData.get("phone")??"").trim();
  const graduationRaw=String(formData.get("graduationYear")??"").trim();
  if(legalName.length<2)redirect("/careers/profile?error=Please+enter+your+full+legal+name.");
  const graduationYear=graduationRaw?Number(graduationRaw):null;
  if(graduationYear!==null&&(!Number.isInteger(graduationYear)||graduationYear<1950||graduationYear>2100))redirect("/careers/profile?error=Please+enter+a+valid+graduation+year.");
  const base=await supabase.from("profiles").update({legal_name:legalName,preferred_name:String(formData.get("preferredName")??"").trim()||null,phone:phone||null,updated_at:new Date().toISOString()}).eq("id",user.id);
  if(base.error)redirect(`/careers/profile?error=${encodeURIComponent("Your profile could not be saved. Please try again.")}`);
  const career=await supabase.from("career_profiles").upsert({user_id:user.id,location:String(formData.get("location")??"").trim()||null,applicant_type:String(formData.get("applicantType")??"").trim()||null,institution_or_employer:String(formData.get("institution")??"").trim()||null,degree_or_field:String(formData.get("degree")??"").trim()||null,graduation_year:graduationYear,linkedin_url:String(formData.get("linkedinUrl")??"").trim()||null,work_url:String(formData.get("workUrl")??"").trim()||null,professional_summary:String(formData.get("professionalSummary")??"").trim()||null,updated_at:new Date().toISOString()},{onConflict:"user_id"});
  if(career.error)redirect(`/careers/profile?error=${encodeURIComponent("Your careers profile could not be saved. Please try again.")}`);
  revalidatePath("/careers/dashboard");
  revalidatePath("/careers/profile");
  redirect("/careers/dashboard?profile=saved");
}

export default async function CareerProfile({searchParams}:{searchParams:Promise<{error?:string}>}){
  const {error}=await searchParams;const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/sign-in?next=/careers/profile");
  const [{data:profile},{data:career}]=await Promise.all([supabase.from("profiles").select("legal_name,preferred_name,primary_email,phone").eq("id",user.id).single(),supabase.from("career_profiles").select("*").eq("user_id",user.id).maybeSingle()]);
  return <main className="section white"><div className="shell career-application-shell"><Link className="card-link" href="/careers/dashboard">← Careers dashboard</Link><div className="eyebrow">Reusable careers profile</div><h2>Your professional profile</h2><p className="lead">Keep this information current once, then reuse it when you apply for an EFF council, professional-service, or volunteer opportunity.</p>{error&&<div className="notice error-text" role="alert">{error}</div>}<form action={saveCareerProfile} className="application-form career-form"><section className="form-section"><span className="section-number">01</span><h3>Contact information</h3><div className="form-grid"><label>Full legal name<input name="legalName" required maxLength={120} defaultValue={profile?.legal_name??""}/></label><label>Preferred name <span className="optional">optional</span><input name="preferredName" maxLength={80} defaultValue={profile?.preferred_name??""}/></label><label>Account email<input value={profile?.primary_email??user.email??""} readOnly aria-readonly="true"/></label><label>Phone<input name="phone" type="tel" maxLength={40} defaultValue={profile?.phone??""}/></label><label className="full-field">City, state/province, country<input name="location" maxLength={160} defaultValue={career?.location??""}/></label></div></section><section className="form-section"><span className="section-number">02</span><h3>Education and professional information</h3><div className="form-grid"><label>Current status<select name="applicantType" defaultValue={career?.applicant_type??""}><option value="">Select one</option><option>Current college student</option><option>Graduate or alumnus</option><option>Working professional</option><option>Other</option></select></label><label>College, university, or employer<input name="institution" maxLength={180} defaultValue={career?.institution_or_employer??""}/></label><label>Degree, major, or professional field<input name="degree" maxLength={180} defaultValue={career?.degree_or_field??""}/></label><label>Graduation year <span className="optional">if applicable</span><input name="graduationYear" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} defaultValue={career?.graduation_year??""}/></label><label>LinkedIn or professional profile <span className="optional">optional</span><input name="linkedinUrl" type="url" placeholder="https://" maxLength={500} defaultValue={career?.linkedin_url??""}/></label><label>Portfolio or work link <span className="optional">optional</span><input name="workUrl" type="url" placeholder="https://" maxLength={500} defaultValue={career?.work_url??""}/></label><label className="full-field">Professional summary <span className="optional">optional</span><textarea name="professionalSummary" maxLength={2000} defaultValue={career?.professional_summary??""}/></label></div></section><div className="form-actions"><Link className="button outline" href="/careers/dashboard">Cancel</Link><button className="button">Save careers profile</button></div></form></div></main>;
}
