import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string, maxLength: number) {
  return String(formData.get(key) ?? "").trim().slice(0, maxLength) || null;
}

async function saveMemberProfile(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/careers/member-profile");

  const displayName = value(formData, "displayName", 120);
  const shortBio = value(formData, "shortBio", 1500);
  if (!displayName || displayName.length < 2) redirect("/careers/member-profile?error=Please+enter+your+display+name.");
  if (!shortBio || shortBio.length < 25) redirect("/careers/member-profile?error=Please+write+a+short+member+bio+of+at+least+25+characters.");

  const { error } = await supabase.from("national_member_profiles").upsert({
    user_id: user.id,
    display_name: displayName,
    school_or_employer: value(formData, "schoolOrEmployer", 180),
    degree_or_field: value(formData, "degreeOrField", 180),
    location_timezone: value(formData, "locationTimezone", 180),
    short_bio: shortBio,
    strengths: value(formData, "strengths", 1500),
    service_focus: value(formData, "serviceFocus", 1500),
    availability: value(formData, "availability", 1000),
    linkedin_url: value(formData, "linkedinUrl", 500),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  if (error) redirect(`/careers/member-profile?error=${encodeURIComponent("Your national member profile could not be saved. Please try again.")}`);
  revalidatePath("/careers/dashboard");
  revalidatePath("/careers/member-profile");
  redirect("/careers/dashboard?member=saved");
}

export default async function NationalMemberProfile({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/careers/member-profile");

  const [{ data: base }, { data: member }] = await Promise.all([
    supabase.from("profiles").select("legal_name,preferred_name,primary_email").eq("id", user.id).single(),
    supabase.from("national_member_profiles").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  return (
    <main className="section white">
      <div className="shell career-application-shell">
        <Link className="card-link" href="/careers/dashboard">← Careers dashboard</Link>
        <div className="eyebrow">Private national member workspace</div>
        <h2>Your national member profile</h2>
        <p className="lead">Help EFF understand how to support you, collaborate with you, and use your strengths well. This profile is private unless you later authorize a public biography.</p>

        {error && <div className="notice error-text" role="alert">{error}</div>}

        <form action={saveMemberProfile} className="application-form career-form">
          <section className="form-section">
            <span className="section-number">01</span>
            <h3>Member identity</h3>
            <div className="form-grid">
              <label>Display name<input name="displayName" required maxLength={120} defaultValue={member?.display_name ?? base?.preferred_name ?? base?.legal_name ?? ""} /></label>
              <label>Account email<input value={base?.primary_email ?? user.email ?? ""} readOnly aria-readonly="true" /></label>
              <label>EFF role<input value={member?.role_title ?? "Assigned by the EFF National Office"} readOnly aria-readonly="true" /></label>
              <label>Member status<input value={member?.membership_status ?? "Pending verification"} readOnly aria-readonly="true" /></label>
              <label>School or employer <span className="optional">optional</span><input name="schoolOrEmployer" maxLength={180} defaultValue={member?.school_or_employer ?? ""} /></label>
              <label>Degree, major, or professional field <span className="optional">optional</span><input name="degreeOrField" maxLength={180} defaultValue={member?.degree_or_field ?? ""} /></label>
              <label className="full-field">City and time zone <span className="optional">optional</span><input name="locationTimezone" maxLength={180} placeholder="Tallahassee, Florida · Eastern Time" defaultValue={member?.location_timezone ?? ""} /></label>
            </div>
          </section>

          <section className="form-section">
            <span className="section-number">02</span>
            <h3>How you serve</h3>
            <div className="form-grid">
              <label className="full-field">Short member bio<textarea name="shortBio" required minLength={25} maxLength={1500} defaultValue={member?.short_bio ?? ""} /></label>
              <label className="full-field">Strengths and skills <span className="optional">optional</span><textarea name="strengths" maxLength={1500} placeholder="Examples: chapter coaching, project management, ministry, partnerships, research" defaultValue={member?.strengths ?? ""} /></label>
              <label className="full-field">Service focus <span className="optional">optional</span><textarea name="serviceFocus" maxLength={1500} placeholder="What student, chapter, or national priorities are you most prepared to support?" defaultValue={member?.service_focus ?? ""} /></label>
              <label className="full-field">Realistic availability <span className="optional">optional</span><textarea name="availability" maxLength={1000} placeholder="Include your time zone, recurring conflicts, and best collaboration times." defaultValue={member?.availability ?? ""} /></label>
              <label className="full-field">LinkedIn or professional profile <span className="optional">optional</span><input name="linkedinUrl" type="url" maxLength={500} placeholder="https://" defaultValue={member?.linkedin_url ?? ""} /></label>
            </div>
          </section>

          <div className="notice">
            Do not enter Social Security numbers, passwords, verification codes, tax returns, full banking information, medical records, or other sensitive personal documents in this profile.
          </div>

          <div className="form-actions">
            <Link className="button outline" href="/careers/dashboard">Cancel</Link>
            <button className="button">Save national member profile</button>
          </div>
        </form>
      </div>
    </main>
  );
}
