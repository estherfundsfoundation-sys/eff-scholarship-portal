import Link from "next/link";
import {BookOpenCheck, Camera, CheckCircle2, MapPin, ShieldCheck} from "lucide-react";
import {requireReachAmbassador} from "@/lib/reach/ambassador";
import {submitReachActivity} from "./actions";

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
  searchParams: Promise<{error?: string; submitted?: string}>;
}) {
  const params = await searchParams;
  const {admin, user, ambassador} = await requireReachAmbassador();
  if (!ambassador) return <main className="section white"><div className="shell" style={{maxWidth:780}}>
    <div className="card"><div className="eyebrow">REACH Ambassador access</div><h2>This account is not connected to an active invitation.</h2><p>Use the exact email address where EFF sent your REACH Ambassador invitation.</p><Link className="button" href="/reach/claim">Check my invitation</Link></div>
  </div></main>;

  const [{data: resources}, {data: submissions}, {data: profile}] = await Promise.all([
    admin.from("reach_resources").select("id,title,description,category,resource_url").eq("active", true).order("category").order("title"),
    admin.from("reach_activity_submissions").select("id,title,activity_type,campus,activity_date,students_reached,status,review_note,created_at").eq("ambassador_id", ambassador.id).order("created_at", {ascending:false}),
    admin.from("profiles").select("legal_name,preferred_name,institution").eq("id", user.id).maybeSingle(),
  ]);
  const name = ambassador.full_name || profile?.preferred_name || profile?.legal_name || "Ambassador";
  const campus = ambassador.institution || profile?.institution || "";

  return <main className="section white"><div className="shell">
    <div className="section-head"><div><div className="eyebrow">Private REACH Ambassador workspace</div><h2>Welcome, {name}</h2><p>Access outreach tools, document your campus impact, and submit photos for National Office review.</p></div><Link className="button outline" href="https://reach.estherfundsfoundation.org">Open REACH Action Hub</Link></div>
    {params.submitted && <div className="notice"><CheckCircle2 size={18}/><strong>Your activity was submitted.</strong> EFF will review it before anything is published.</div>}
    {params.error && <div className="notice error-text" role="alert">{params.error}</div>}

    <div className="stats admin-stats" style={{marginTop:24}}>
      <div className="stat"><strong>{resources?.length ?? 0}</strong><span>Available resources</span></div>
      <div className="stat"><strong>{submissions?.length ?? 0}</strong><span>Activities submitted</span></div>
      <div className="stat"><strong>{submissions?.filter(item=>item.status==="published").length ?? 0}</strong><span>Published impact stories</span></div>
    </div>

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
      <section className="form-section"><span className="section-number">02</span><h3>Share photos for review</h3>
        <label className="career-upload"><Camera/><strong>Upload up to six photos</strong><span>JPG, PNG, or WEBP, up to 6 MB each. Photos stay private until National Office reviews and approves them.</span><input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple/></label>
        <div className="career-privacy"><ShieldCheck/><p>Do not upload private student records, grades, financial information, IDs, or images of anyone who did not agree to be photographed and shared with EFF. National Office decides whether approved photos are published.</p></div>
        <label className="check"><input name="consent" type="checkbox" required/><span>I confirm that I have permission to submit these photos, no private student information is shown, and EFF may review them for possible publication.</span></label>
      </section>
      <button className="button" type="submit"><MapPin size={17}/> Submit campus activity</button>
    </form>

    <section style={{marginTop:40}}><div className="eyebrow">Your activity history</div><h3>Submissions and review status</h3>
      {submissions?.length ? submissions.map(item=><article className="card" key={item.id} style={{marginTop:14}}><div className="section-head"><div><div className="eyebrow">{item.activity_type.replaceAll("_"," ")}</div><h3>{item.title}</h3><p className="muted">{item.campus} Â· {new Date(`${item.activity_date}T12:00:00`).toLocaleDateString()}</p></div><span className="status">{statusLabels[item.status] ?? item.status}</span></div>{item.review_note && <div className="notice">{item.review_note}</div>}</article>) : <div className="card"><p>No campus activities have been submitted yet.</p></div>}
    </section>
  </div></main>;
}

