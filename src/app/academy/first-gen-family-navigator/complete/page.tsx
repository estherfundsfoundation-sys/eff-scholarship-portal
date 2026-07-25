import Image from "next/image";
import Link from "next/link";
import {redirect} from "next/navigation";
import {Award, CheckCircle2, Download, PenLine, ShieldCheck} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
import {FIRST_GEN_FAMILY_NAVIGATOR_COURSE_ID} from "@/lib/academy/first-gen-family-navigator";
import {saveFamilyNavigatorCertificateName} from "./actions";

export const metadata = {title: "Your EFF First-Generation Family Navigator Certificate"};

export default async function FamilyNavigatorCompletePage({
  searchParams,
}: {
  searchParams: Promise<{saved?: string; error?: string}>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/academy/first-gen-family-navigator/complete");

  const [{data: completion}, {data: profile}] = await Promise.all([
    supabase
      .from("academy_course_completions")
      .select("score,completed_at,certificate_code,certificate_name")
      .eq("user_id", user.id)
      .eq("course_id", FIRST_GEN_FAMILY_NAVIGATOR_COURSE_ID)
      .maybeSingle(),
    supabase.from("profiles").select("legal_name,preferred_name").eq("id", user.id).single(),
  ]);
  if (!completion) redirect("/academy/first-gen-family-navigator");

  const suggestedName = profile?.legal_name || profile?.preferred_name || "";
  const certificateName = completion.certificate_name?.trim() || "";
  const completedDate = new Date(completion.completed_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <main className="section academy-certificate-page">
      <div className="shell academy-certificate-shell">
        <header className="academy-certificate-intro">
          <span><Award aria-hidden="true"/> Course complete</span>
          <h1>You earned it.</h1>
          <p>Confirm the name you want printed on your official EFF course-completion certificate, then download your high-resolution PDF.</p>
        </header>

        <section className="academy-name-card" aria-labelledby="certificate-name-heading">
          <div className="academy-name-card-icon"><PenLine aria-hidden="true"/></div>
          <div>
            <h2 id="certificate-name-heading">Name on certificate</h2>
            <p>Enter your name exactly as you want it to appear. You can return here to correct it later.</p>
          </div>
          <form action={saveFamilyNavigatorCertificateName}>
            <label>
              Certificate name
              <input name="certificateName" type="text" required minLength={2} maxLength={90} defaultValue={certificateName || suggestedName} placeholder="First and last name" autoComplete="name"/>
            </label>
            <button className="button" type="submit">Save name</button>
          </form>
          {params.saved === "1" ? <p className="academy-name-success"><CheckCircle2 aria-hidden="true"/> Your certificate name is saved. Your PDF is ready.</p> : null}
          {params.error ? (
            <p className="academy-name-error">{params.error === "name" ? "Please enter a valid name using letters, spaces, apostrophes, hyphens, periods, or commas." : "We could not save your name. Please try again."}</p>
          ) : null}
        </section>

        <section className="academy-certificate-sheet" aria-label="Certificate preview">
          <span className="academy-cert-corner academy-cert-corner-one" aria-hidden="true"/>
          <span className="academy-cert-corner academy-cert-corner-two" aria-hidden="true"/>
          <span className="academy-cert-corner academy-cert-corner-three" aria-hidden="true"/>
          <span className="academy-cert-corner academy-cert-corner-four" aria-hidden="true"/>
          <div className="academy-cert-header">
            <div className="academy-cert-brand">
              <Image src="/brand/eff-logo.png" alt="Esther Funds Foundation" width={74} height={74}/>
              <div><strong>Esther Funds Foundation</strong><span>Leadership Training Academy</span></div>
            </div>
            <div className="academy-cert-motto"><strong>Every Future Fulfilled</strong><span>For such a time as this. — Esther 4:14</span></div>
          </div>
          <div className="academy-cert-body">
            <p className="academy-cert-title">Certificate of Completion</p>
            <p className="academy-cert-presented">Proudly presented to</p>
            <h2>{certificateName || suggestedName || "Your name"}</h2>
            <div className="academy-cert-name-line"/>
            <p>for successfully completing the training requirements for</p>
            <h3>EFF First-Generation Family Navigator</h3>
            <p className="academy-cert-scope">Asset-based family support, student advocacy, privacy, crisis navigation, and responsible referral.</p>
            <strong className="academy-cert-result">Completed {completedDate} &nbsp;•&nbsp; Passing score {completion.score}%</strong>
          </div>
          <div className="academy-cert-signature">
            <div><span className="academy-cert-signature-line"/><strong>Shayna Vincent</strong><small>Founder &amp; Chief Executive Officer</small></div>
            <div className="academy-cert-seal"><Award aria-hidden="true"/><span>EFF</span><small>Certified</small></div>
          </div>
          <div className="academy-cert-footer">
            <strong>Certificate ID&nbsp; {completion.certificate_code}</strong>
            <span>portal.estherfundsfoundation.org</span>
          </div>
          <small className="academy-cert-disclaimer">EFF course-completion credential. Not professional licensure or authority to act for a student or institution.</small>
        </section>

        <div className="academy-certificate-actions">
          {certificateName ? (
            <a className="button" href="/academy/first-gen-family-navigator/certificate"><Download size={18}/> Download my PDF certificate</a>
          ) : (
            <span className="button academy-download-disabled" aria-disabled="true"><Download size={18}/> Save your name to unlock PDF</span>
          )}
          <Link className="button outline" href="/academy">Return to academy</Link>
        </div>
        <div className="academy-credential-note">
          <ShieldCheck aria-hidden="true"/>
          <p><strong>Credential scope:</strong> This certificate recognizes completion of Esther Funds Foundation family-navigation training. It does not authorize the holder to act as a student, access private accounts or records, make institutional decisions, or represent themselves as a college employee, counselor, attorney, or financial-aid administrator.</p>
        </div>
      </div>
    </main>
  );
}
