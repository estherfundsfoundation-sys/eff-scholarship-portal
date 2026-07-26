/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import {ArrowRight, Globe2, MapPin, ShieldCheck} from "lucide-react";
import {getPublicReachAmbassadors} from "@/lib/reach/public";

export const dynamic = "force-dynamic";

export default async function ReachAmbassadorDirectoryPage() {
  const ambassadors = await getPublicReachAmbassadors();
  return <main className="reach-directory-page">
    <section className="reach-directory-hero"><div className="shell">
      <div className="eyebrow">REACH Ambassador Directory</div>
      <h1>Meet the students turning care into action.</h1>
      <p>REACH Ambassadors connect classmates and communities to practical resources, encouragement, and pathways that help students stay enrolled.</p>
      <div className="resource-actions">
        <Link className="button" href="https://reach.estherfundsfoundation.org">Explore the REACH Action Hub</Link>
        <Link className="button outline" href="/reach/claim">Claim an invited account</Link>
      </div>
    </div></section>
    <section className="section white"><div className="shell">
      <div className="reach-directory-trust"><ShieldCheck/><div><strong>Published by the ambassador.</strong><span>Every profile appears only after the ambassador explicitly chooses what to share publicly.</span></div></div>
      {ambassadors.length ? <div className="reach-directory-grid">
        {ambassadors.map((ambassador) => <Link className="reach-ambassador-card" href={`/reach/ambassadors/${ambassador.slug}`} key={ambassador.slug}>
          <div className="reach-avatar">{ambassador.photo_url ? <img src={ambassador.photo_url} alt=""/> : <span>{ambassador.display_name.split(/\s+/).slice(0,2).map((part) => part[0]).join("")}</span>}</div>
          <div className="eyebrow">{ambassador.class_year || "REACH Ambassador"}</div>
          <h2>{ambassador.display_name}</h2>
          {ambassador.headline && <p className="reach-headline">{ambassador.headline}</p>}
          <p className="reach-school"><MapPin size={16}/>{ambassador.institution}</p>
          {ambassador.focus_areas.length > 0 && <div className="reach-tags">{ambassador.focus_areas.slice(0,3).map((area) => <span key={area}>{area}</span>)}</div>}
          <b>View ambassador profile <ArrowRight size={16}/></b>
        </Link>)}
      </div> : <div className="reach-directory-empty"><Globe2/><h2>Profiles are being prepared.</h2><p>Ambassadors may now build and publish their profiles directly from the secure workspace.</p><Link className="button" href="/reach/ambassador">Open Ambassador Workspace</Link></div>}
    </div></section>
  </main>;
}
