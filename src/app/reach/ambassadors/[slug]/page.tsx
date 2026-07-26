/* eslint-disable @next/next/no-img-element */
import type {Metadata} from "next";
import Link from "next/link";
import {ArrowLeft, Instagram, Linkedin, MapPin, Sparkles} from "lucide-react";
import {notFound} from "next/navigation";
import {getPublicReachAmbassador} from "@/lib/reach/public";

export const dynamic = "force-dynamic";

export async function generateMetadata({params}: {params: Promise<{slug:string}>}): Promise<Metadata> {
  const {slug} = await params;
  const ambassador = await getPublicReachAmbassador(slug);
  if (!ambassador) return {title: "REACH Ambassador"};
  return {
    title: `${ambassador.display_name} | REACH Ambassador`,
    description: ambassador.headline || `${ambassador.display_name} serves as a REACH Ambassador at ${ambassador.institution}.`,
  };
}

export default async function ReachAmbassadorProfilePage({params}: {params: Promise<{slug:string}>}) {
  const {slug} = await params;
  const ambassador = await getPublicReachAmbassador(slug);
  if (!ambassador) notFound();
  return <main className="reach-public-profile">
    <section className="reach-profile-hero"><div className="shell">
      <Link className="reach-back-link" href="/reach/ambassadors"><ArrowLeft size={17}/> Ambassador Directory</Link>
      <div className="reach-profile-heading">
        <div className="reach-avatar large">{ambassador.photo_url ? <img src={ambassador.photo_url} alt=""/> : <span>{ambassador.display_name.split(/\s+/).slice(0,2).map((part) => part[0]).join("")}</span>}</div>
        <div><div className="eyebrow">EFF REACH Ambassador</div><h1>{ambassador.display_name}</h1>{ambassador.headline && <p className="reach-profile-headline">{ambassador.headline}</p>}<p className="reach-profile-school"><MapPin/>{ambassador.institution}</p></div>
      </div>
    </div></section>
    <section className="section white"><div className="shell reach-profile-layout">
      <article className="reach-profile-story">
        <div className="eyebrow">Meet the ambassador</div><h2>Service starts with connection.</h2><p>{ambassador.bio}</p>
        {ambassador.why_reach && <blockquote><Sparkles/><p>“{ambassador.why_reach}”</p><footer>Why REACH matters to {ambassador.display_name.split(" ")[0]}</footer></blockquote>}
      </article>
      <aside className="reach-profile-facts">
        <div className="eyebrow">Profile</div>
        {ambassador.major && <div><span>Area of study</span><strong>{ambassador.major}</strong></div>}
        {ambassador.class_year && <div><span>Student status</span><strong>{ambassador.class_year}</strong></div>}
        {ambassador.focus_areas.length > 0 && <div><span>Focus areas</span><div className="reach-tags">{ambassador.focus_areas.map((area) => <b key={area}>{area}</b>)}</div></div>}
        {(ambassador.instagram_url || ambassador.linkedin_url) && <div><span>Connect</span><div className="reach-socials">{ambassador.instagram_url && <a href={ambassador.instagram_url} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram/> Instagram</a>}{ambassador.linkedin_url && <a href={ambassador.linkedin_url} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><Linkedin/> LinkedIn</a>}</div></div>}
      </aside>
    </div></section>
    {ambassador.activities.length > 0 && <section className="section cream"><div className="shell"><div className="eyebrow">Campus impact</div><h2>REACH in action</h2><div className="reach-activity-grid">{ambassador.activities.map((activity) => <article className="reach-activity-card" key={activity.id}>{activity.photo_urls[0] && <img src={activity.photo_urls[0]} alt=""/>}<div><div className="eyebrow">{activity.activity_type.replaceAll("_"," ")}</div><h3>{activity.title}</h3><p>{activity.description}</p><small>{activity.campus} · {new Date(`${activity.activity_date}T12:00:00`).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</small></div></article>)}</div></div></section>}
    <section className="reach-profile-cta"><div className="shell"><div><div className="eyebrow">Find your next step</div><h2>Explore tools built to help students hold on.</h2></div><Link className="button" href="https://reach.estherfundsfoundation.org">Open the REACH Action Hub</Link></div></section>
  </main>;
}
