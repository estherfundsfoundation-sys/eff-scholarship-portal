import Link from "next/link";
import { redirect } from "next/navigation";
import { BriefcaseBusiness, CheckCircle2, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const statusLabel: Record<string, string> = {
  submitted: "Submitted",
  in_review: "In review",
  interview: "Interview stage",
  selected: "Selected",
  not_selected: "Not selected",
  withdrawn: "Withdrawn",
};

export default async function CareersDashboard({ searchParams }: { searchParams: Promise<{ profile?: string; member?: string }> }) {
  const { profile: saved, member: memberSaved } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/careers/dashboard");

  const [{ data: base }, { data: career }, { data: member }, { data: applications }] = await Promise.all([
    supabase.from("profiles").select("legal_name,preferred_name,primary_email,phone").eq("id", user.id).single(),
    supabase.from("career_profiles").select("location,applicant_type,institution_or_employer,degree_or_field").eq("user_id", user.id).maybeSingle(),
    supabase.from("national_member_profiles").select("display_name,role_title,membership_status,short_bio").eq("user_id", user.id).maybeSingle(),
    supabase.from("career_applications").select("id,role_slug,role_title,category,posting_term,status,created_at,updated_at").order("created_at", { ascending: false }),
  ]);

  const profileComplete = Boolean(base?.legal_name && base?.phone && career?.location && career?.applicant_type && career?.institution_or_employer && career?.degree_or_field);
  const memberComplete = Boolean(member?.display_name && member?.short_bio);
  const name = base?.preferred_name || base?.legal_name || "there";

  return (
    <main className="section white">
      <div className="shell">
        <div className="section-head">
          <div>
            <div className="eyebrow">EFF careers portal</div>
            <h2>Welcome, {name}.</h2>
            <p>Manage your professional profile, national-member profile, and council or service applications in one secure place.</p>
          </div>
          <Link className="button" href="/careers">View opportunities</Link>
        </div>

        {saved && <div className="notice"><strong>Professional profile saved.</strong> Your updated information is ready for future applications.</div>}
        {memberSaved && <div className="notice"><strong>National member profile saved.</strong> Your private member information is current.</div>}

        <div className="split" style={{ alignItems: "start", marginTop: 28 }}>
          <section>
            <h3>Your applications</h3>
            {applications?.length ? applications.map((item) => (
              <article className="card" key={item.id} style={{ marginTop: 12 }}>
                <div className="eyebrow">{item.posting_term} · {item.category}</div>
                <h3>{item.role_title}</h3>
                <p><strong>{statusLabel[item.status] ?? item.status.replaceAll("_", " ")}</strong> · Submitted {new Date(item.created_at).toLocaleDateString()}</p>
                <p className="muted">Official updates appear here. Selection is not final until EFF issues and signs the applicable written agreement.</p>
                <Link className="button outline" href={`/careers/applications/${item.id}`}>View application</Link>
              </article>
            )) : (
              <div className="card" style={{ marginTop: 12 }}>
                <BriefcaseBusiness />
                <h3>No careers applications yet</h3>
                <p className="muted">Explore current council, professional-service, and volunteer opportunities when you are ready.</p>
                <Link className="button" href="/careers#openings">Explore opportunities</Link>
              </div>
            )}
          </section>

          <aside>
            <div className="card">
              <UserRound />
              <h3>Professional profile</h3>
              <p className="muted">{profileComplete ? "Your reusable careers profile is ready." : "Complete the remaining fields before applying."}</p>
              <Link className="button outline" href="/careers/profile">{profileComplete ? "Review profile" : "Complete profile"}</Link>
            </div>

            <div className="card" style={{ marginTop: 16 }}>
              <UsersRound />
              <h3>National member profile</h3>
              <p className="muted">{memberComplete ? "Your private national-member profile is ready." : "Create your member bio, strengths, service focus, and availability."}</p>
              {member?.role_title && <p><strong>{member.role_title}</strong><br /><small>{member.membership_status ?? "Pending"}</small></p>}
              <Link className="button outline" href="/careers/member-profile">{memberComplete ? "Review member profile" : "Create member profile"}</Link>
            </div>

            <div className="notice" style={{ marginTop: 16 }}>
              <CheckCircle2 />
              <strong> Paid council terms</strong><br />
              The fixed-term stipend is up to $1,000 total. The start date and payment schedule will be provided in writing. Renewal is not automatic and depends on funding and new written terms.
            </div>

            <div className="notice" style={{ marginTop: 16 }}>
              <ShieldCheck />
              <strong> Private by default</strong><br />
              National-member profile information is visible only to the account owner and authorized EFF staff unless EFF later obtains permission for a public biography.
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
