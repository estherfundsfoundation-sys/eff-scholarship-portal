import Link from "next/link";
import {Award, BookOpenCheck, Camera, CheckCircle2, Download, Globe2, GraduationCap, MapPin, MessageCircle, Palette, ShieldCheck, UserRoundCheck} from "lucide-react";
import {requireReachAmbassador} from "@/lib/reach/ambassador";
import {submitReachActivity, submitReachProfile} from "./actions";

const statusLabels: Record<string,string> = {
  pending_review: "Pending National Office review",
  approved: "Approved",
  published: "Published to the REACH impact page",
  changes_requested: "Changes requested",
  not_published: "Reviewed â€” kept private",
};

export default async function ReachAmbassadorPage({
  searchParams,
}: {
  searchParams: Promise<{error?: string; submitted?: string; profileSubmitted?: string}>;
}) {
  const params = await searchParams;
  const {admin, user, ambassador} = await requireReachAmbassador();
  if (!ambassador) return <main className="section white"><div className="shell" style={{maxWidth:780}}>
    <div className="card"><div className="eyebrow">REACH Ambassador access</div><h2>This account is not connected to an active invitation.</h2><p>Request a private claim link, then connect your invitation to any verified email address you control.</p><Link className="button" href="/reach/claim">Connect my invitation</Link></div>
  </div></main>;

  const [{data: resources}, {data: submissions}, {data: profile}, {data: publicProfile}] = await Promise.all([
    admin.from("reach_resources").select("id,title,description,category,resource_url").eq("active", true).order("category").order("title"),
    admin.from("reach_activity_submissions").select("id,title,activity_type,campus,activity_date,students_reached,status,review_note,created_at").eq("ambassador_id", ambassador.id).order("created_at", {ascending:false}),
    admin.from("profiles").select("legal_name,preferred_name,institution").eq("id", user.id).maybeSingle(),
    admin.from("reach_ambassador_profiles").select("slug,display_name,headline,institution,major,class_year,bio,why_reach,focus_areas,instagram_url,linkedin_url,private_photo_path,public_photo_path,status,review_note").eq("ambassador_id", ambassador.id).maybeSingle(),
  ]);
  const name = ambassador.full_name || profile?.preferred_name || profile?.legal_name || "Ambassador";
  const campus = ambassador.institution || profile?.institution || "";

  return <main className="section white"><div className="shell">
    <div className="section-head"><div><div className="eyebrow">Private REACH Ambassador workspace</div><h2>Welcome, {name}</h2><p>Access outreach tools, document your campus impact, and publish consent-confirmed stories to your profile.</p></div><Link className="button outline" href="https://reach.estherfundsfoundation.org">Open REACH Action Hub</Link></div>
    {params.submitted && <div className="notice"><CheckCircle2 size={18}/><strong>Your activity is live.</strong> It now appears on your public profile.</div>}
    {params.profileSubmitted && <div className="notice"><UserRoundCheck size={18}/><strong>Your public profile is live.</strong> You may update it whenever you need to.</div>}
    {params.error && <div className="notice error-text" role="alert">{params.error}</div>}

    <section className="reach-onboarding-panel">
      <div>
        <div className="eyebrow">Your REACH onboarding</div>
        <h3>{ambassador.certified_at ? "You are a certified REACH Campus Ambassador." : "Complete training before representing REACH."}</h3>
        <p>{ambassador.certified_at
          ? `Certification earned with a score of ${ambassador.training_score}%. Keep using the approved tools and brand rules in this workspace.`
          : "The EFF-hosted course covers the five REACH pillars, care packages, safe student support, workshops, crisis response, professionalism, brand rules, and your first 30 days."}</p>
        <div className="resource-actions">
          <Link className="button" href="/reach/ambassador/training"><GraduationCap size={18}/>{ambassador.certified_at ? "Review training" : "Start certification"}</Link>
          {ambassador.certified_at && <a className="button light" href="/reach/ambassador/certificate"><Award size={18}/>Download certificate</a>}
          <a className="button outline" href="/reach/ambassador/acceptance-letter"><Download size={18}/>Acceptance letter</a>
        </div>
      </div>
      <div className="reach-onboarding-links">
        <a href="https://groupme.com/join_group/115383772/RY1wMSj8" target="_blank" rel="noopener noreferrer"><MessageCircle/><span><strong>Official GroupMe</strong><small>Updates, questions, and community</small></span></a>
        <a href="https://canva.link/ylmn6n7bgocjlcp" target="_blank" rel="noopener noreferrer"><Palette/><span><strong>Introduction graphic</strong><small>Share from your personal account only</small></span></a>
        <div><ShieldCheck/><span><strong>Brand rule</strong><small>No unofficial EFF or REACH pages, groups, fundraisers, or accounts without written approval.</small></span></div>
      </div>
    </section>

    <div className="stats admin-stats" style={{marginTop:24}}>
      <div className="stat"><strong>{resources?.length ?? 0}</strong><span>Available resources</span></div>
      <div className="stat"><strong>{submissions?.length ?? 0}</strong><span>Activities submitted</span></div>
      <div className="stat"><strong>{ambassador.certified_at ? "Certified" : "Not yet"}</strong><span>Training status</span></div>
    </div>

    <section className="reach-profile-editor" style={{marginTop:36}}>
      <div className="reach-profile-intro"><div className="eyebrow">Your public ambassador profile</div><h3>Introduce yourself to the REACH community</h3><p>Choose what the public may see. Your email address, login information, and private submissions are never shown.</p>
        <div className="notice"><Globe2 size={19}/><div><strong>{publicProfile?.status === "published" ? "Your profile is live." : "Complete the form to publish your profile."}</strong></div></div>
        {publicProfile?.status === "published" && <Link className="button outline" href={`/reach/ambassadors/${publicProfile.slug}`}>View my public profile</Link>}
        <Link className="card-link" href="/reach/ambassadors">Browse the Ambassador Directory →</Link>
      </div>
      <form action={submitReachProfile} encType="multipart/form-data" className="stack reach-profile-form">
        <div className="form-grid">
          <label>Public display name<input name="displayName" required maxLength={80} defaultValue={publicProfile?.display_name ?? name}/></label>
          <label>College or university<input name="institution" required maxLength={160} defaultValue={publicProfile?.institution ?? campus}/></label>
          <label className="full-field">Short headline <span className="muted">(optional)</span><input name="headline" maxLength={140} defaultValue={publicProfile?.headline ?? ""} placeholder="Student advocate · Future educator · Community builder"/></label>
          <label>Major or area of study <span className="muted">(optional)</span><input name="major" maxLength={120} defaultValue={publicProfile?.major ?? ""}/></label>
          <label>Class year <span className="muted">(optional)</span><select name="classYear" defaultValue={publicProfile?.class_year ?? ""}><option value="">Choose one</option><option>First-year</option><option>Sophomore</option><option>Junior</option><option>Senior</option><option>Graduate student</option><option>Alumna / Alumnus</option><option>Community ambassador</option></select></label>
          <label className="full-field">Public bio<textarea name="bio" required minLength={50} maxLength={700} rows={6} defaultValue={publicProfile?.bio ?? ""} placeholder="Share who you are, what you study, and how you serve your campus or community."/></label>
          <label className="full-field">Why REACH matters to me <span className="muted">(optional)</span><textarea name="whyReach" maxLength={700} rows={5} defaultValue={publicProfile?.why_reach ?? ""}/></label>
          <label className="full-field">Focus areas <span className="muted">(separate with commas)</span><input name="focusAreas" maxLength={300} defaultValue={Array.isArray(publicProfile?.focus_areas) ? publicProfile.focus_areas.join(", ") : ""} placeholder="FAFSA, student wellness, scholarships, campus outreach"/></label>
          <label>Instagram username <span className="muted">(optional)</span><input name="instagram" maxLength={200} defaultValue={publicProfile?.instagram_url ?? ""} placeholder="@username"/></label>
          <label>LinkedIn URL <span className="muted">(optional)</span><input name="linkedin" type="url" maxLength={300} defaultValue={publicProfile?.linkedin_url ?? ""} placeholder="https://www.linkedin.com/in/..."/></label>
        </div>
        <label className="career-upload"><Camera/><strong>Profile photo (optional)</strong><span>JPG, PNG, or WEBP, up to 6 MB. The photo becomes public when you publish.</span><input name="profilePhoto" type="file" accept="image/jpeg,image/png,image/webp"/></label>
        <label className="check"><input name="profileConsent" type="checkbox" required/><span>I choose to publish this profile publicly and confirm that the information and photo belong to me.</span></label>
        <button className="button" type="submit"><Globe2 size={17}/> Publish my profile</button>
      </form>
    </section>

    <section style={{marginTop:32}}><div className="section-head"><div><div className="eyebrow">Ready-to-use materials</div><h3>Workshop and outreach resource library</h3></div><BookOpenCheck color="#42127F"/></div>
      <div className="cards">{resources?.length ? resources.map(resource=><a className="card" href={resource.resource_url} target="_blank" rel="noopener noreferrer" key={resource.id}><div className="eyebrow">{resource.category}</div><h3>{resource.title}</h3><p>{resource.description}</p><span className="card-link">Open resource â†’</span></a>) : <div className="card"><h3>Resources are being prepared</h3><p>National Office will place workshop decks, handouts, outreach scripts, and training tools here.</p></div>}</div>
    </section>

    <form action={submitReachActivity} className="application-form career-form" encType="multipart/form-data" style={{marginTop:40}}>
      <section className="form-section"><span className="section-number">01</span><h3>Tell us what happened</h3>
        <div className="form-grid">
          <label>Activity type<select name="activityType" required defaultValue=""><option value="" disabled>Select one</option><option value="workshop">Workshop</option><option value="outreach">Campus outreach</option><option value="tabling">Tabling</option><option value="presentation">Presentation</option><option value="partnership">Partnership activity</option><option value="other">Other</option></select></label>
          <label>Activity date<input name="activityDate" type="date" required /></label>
          <label className="full-field">Activity title<input name="title" required maxLength={140} placeholder="Example: FAFSA Peer Support Workshop"/></label>
          <label>Campus or location<input name="campus" required maxLength={180} defaultValue={campus}/></label>
          <label>Students reached <span className="muted">(optional)</span><input name="studentsReached" type="number" min="0" max="100000"/></label>
          <label className="full-field">What did you do, what did students need, and what happened?<textarea name="description" required minLength={20} maxLength={2400} rows={7}/></label>
        </div>
      </section>
      <section className="form-section"><span className="section-number">02</span><h3>Share your impact</h3>
        <label className="career-upload"><Camera/><strong>Upload up to six photos</strong><span>JPG, PNG, or WEBP, up to 6 MB each. Submitted photos will appear on your public profile.</span><input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple/></label>
        <div className="career-privacy"><ShieldCheck/><p>Do not upload private student records, grades, financial information, IDs, or images of anyone who did not agree to be photographed and published.</p></div>
        <label className="check"><input name="consent" type="checkbox" required/><span>I confirm that everyone shown agreed to public sharing, no private student information is visible, and EFF may display these photos on my public profile.</span></label>
      </section>
      <button className="button" type="submit"><MapPin size={17}/> Submit campus activity</button>
    </form>

    <section style={{marginTop:40}}><div className="eyebrow">Your activity history</div><h3>Published campus impact</h3>
      {submissions?.length ? submissions.map(item=><article className="card" key={item.id} style={{marginTop:14}}><div className="section-head"><div><div className="eyebrow">{item.activity_type.replaceAll("_"," ")}</div><h3>{item.title}</h3><p className="muted">{item.campus} Â· {new Date(`${item.activity_date}T12:00:00`).toLocaleDateString()}</p></div><span className="status">{statusLabels[item.status] ?? item.status}</span></div>{item.review_note && <div className="notice">{item.review_note}</div>}</article>) : <div className="card"><p>No campus activities have been submitted yet.</p></div>}
    </section>
  </div></main>;
}

