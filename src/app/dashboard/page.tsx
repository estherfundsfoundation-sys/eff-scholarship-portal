import Link from "next/link";
import {createClient} from "@/lib/supabase/server";
import {signOut} from "@/app/auth/actions";
import {applicantLabels, type ApplicationStatus} from "@/lib/domain";

const encouragements = [
  {message: "You are more than the need you are naming today. Asking for support is an act of courage, and we’re honored to hear your story.", scripture: "Cast all your anxiety on Him because He cares for you. — 1 Peter 5:7"},
  {message: "Take this application one step at a time. You do not have to carry the whole journey in a single moment.", scripture: "My grace is sufficient for you. — 2 Corinthians 12:9"},
  {message: "Your present circumstances do not define the promise in your future. Keep going—we are rooting for you.", scripture: "For I know the plans I have for you… plans to give you hope and a future. — Jeremiah 29:11"},
  {message: "There is no shame in needing help. Community is one of the ways provision finds us, and you belong here.", scripture: "Carry each other’s burdens. — Galatians 6:2"},
  {message: "Pause, breathe, and remember how far you have already come. Your persistence matters.", scripture: "Let us not become weary in doing good. — Galatians 6:9"},
  {message: "Your story deserves to be met with dignity and care. Share honestly; perfection is not required here.", scripture: "The Lord is close to the brokenhearted. — Psalm 34:18"},
  {message: "Even uncertain seasons can hold purpose. We hope this portal feels like a door opening, not another burden.", scripture: "For such a time as this. — Esther 4:14"},
  {message: "You have permission to hope boldly. Today’s application is one faithful step toward what comes next.", scripture: "Be strong and courageous… for the Lord your God is with you. — Joshua 1:9"},
];

export default async function Dashboard() {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  const [{data: profile}, {data: applications}, {data: requests}, {data: notifications}] = await Promise.all([
    supabase.from("profiles").select("legal_name,preferred_name,institution,degree_level,major,phone").eq("id", user!.id).single(),
    supabase.from("applications").select("id,status,updated_at,program_cycles(name,programs(name))").order("updated_at", {ascending: false}),
    supabase.from("information_requests").select("id,item,due_at,application_id").is("resolved_at", null),
    supabase.from("notifications").select("id,title,body,href,created_at").order("created_at", {ascending: false}).limit(5),
  ]);
  const name = profile?.preferred_name || profile?.legal_name || "there";
  const profileComplete = Boolean(profile?.legal_name && profile?.institution && profile?.degree_level);
  const encouragement = encouragements[Math.floor(Math.random() * encouragements.length)];
  return <main className="section"><div className="shell">
    <div style={{display: "flex", justifyContent: "space-between", gap: 20, alignItems: "start"}}><div><div className="eyebrow">Applicant portal</div><h2>Your dashboard</h2><p className="muted">Welcome, {name}. Here’s what needs your attention.</p></div><form action={signOut}><button className="button outline">Sign out</button></form></div>
    <section className="ministry-message" aria-label="A word of encouragement"><div className="eyebrow">A word for your journey</div><p className="ministry-copy">{encouragement.message}</p><p className="ministry-scripture">{encouragement.scripture}</p></section>
    <div className="split" style={{alignItems: "start", marginTop: 30}}><section><h3>Applications</h3>{applications?.length ? applications.map(a => <article className="card" key={a.id} style={{marginTop: 12}}><small className="eyebrow">{applicantLabels[a.status as ApplicationStatus] ?? a.status}</small><h3>{(a.program_cycles as unknown as {programs: {name: string}})?.programs?.name ?? "EFF application"}</h3><p className="muted">Updated {new Date(a.updated_at).toLocaleDateString()}</p><Link className="button" href={`/applications/${a.id}`}>View application</Link></article>) : <div className="card" style={{marginTop: 12}}><h3>No applications yet</h3><p className="muted">New applications are completed here in the portal. You can save your progress and return at any time.</p><Link className="button" href="/programs">Explore EFF programs</Link></div>}</section><aside><div className="card"><h3>Profile</h3><p className="muted">{profileComplete ? "Your reusable applicant profile is ready." : "Complete your reusable applicant profile before submitting."}</p><Link className="button outline" href="/profile">{profileComplete ? "Review profile" : "Complete profile"}</Link></div><div className="notice" style={{marginTop: 16}}><strong>{requests?.length ? `${requests.length} information request${requests.length === 1 ? "" : "s"}` : "No new requests"}</strong><br/>{requests?.length ? requests[0].item : "Information requests and decisions will appear here and in your email."}</div>{notifications?.length?<div className="card" style={{marginTop:16}}><h3>Recent updates</h3>{notifications.map(note=><div key={note.id} style={{borderTop:"1px solid #e4d8ef",padding:"12px 0"}}><strong>{note.title}</strong><p className="muted">{note.body}</p>{note.href&&<Link className="card-link" href={note.href}>View details</Link>}</div>)}</div>:null}</aside></div>
  </div></main>;
}
