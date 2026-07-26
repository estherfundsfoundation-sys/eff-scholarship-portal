import type {Metadata} from "next";
import Link from "next/link";
import {ArrowRight,BadgeCheck,Building2,CheckCircle2,ExternalLink,HeartHandshake,MapPin,ShieldCheck} from "lucide-react";
import {notFound} from "next/navigation";
import {createAdminClient} from "@/lib/supabase/admin";

export const dynamic="force-dynamic";

async function getPartner(slug:string){
  try{
    const admin=createAdminClient();
    const {data}=await admin.from("eff_partner_institutions").select("*")
      .eq("slug",slug).in("status",["approved","active"]).eq("public_profile",true).maybeSingle();
    return data;
  }catch{return null;}
}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;const partner=await getPartner(slug);
  return partner?{title:`${partner.display_name} · EFF Partner Campus`,description:partner.public_summary??`${partner.display_name} is an Every Future Fulfilled College Continuity Partner.`}:{title:"Partner School"};
}

export default async function PartnerProfile({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;const partner=await getPartner(slug);if(!partner)notFound();
  const designation=partner.designation==="institute"?"Every Future Fulfilled Institute for Student Continuity":"Every Future Fulfilled Partner Campus";
  return <main className="partner-profile-page">
    <section className="partner-profile-hero"><div className="shell">
      <Link className="back-link" href="/partners/directory">← Partner directory</Link>
      <div className="partner-profile-heading">
        <div className="partner-profile-logo">{partner.logo_url?<img src={partner.logo_url} alt={`${partner.display_name} logo`}/>:<Building2/>}</div>
        <div><div className="partner-profile-badge"><BadgeCheck/>{designation}</div><h1>{partner.display_name}</h1><p><MapPin/>{[partner.city,partner.state].filter(Boolean).join(", ")}{partner.institution_type?` · ${partner.institution_type}`:""}</p></div>
      </div>
    </div></section>
    <section className="section white"><div className="shell partner-profile-grid">
      <div>
        <div className="eyebrow">Why this institution partnered</div><h2>A commitment to intervene before preventable withdrawal.</h2>
        <p className="partner-profile-summary">{partner.public_summary}</p>
        {partner.website_url&&<a className="button outline" href={partner.website_url} target="_blank" rel="noreferrer">Visit the institution website <ExternalLink size={16}/></a>}
      </div>
      <aside className="partner-public-pledge"><HeartHandshake/><h3>The campus continuity commitment</h3>
        <div><CheckCircle2/><span>Make the EFF Help Desk available when a solvable barrier threatens enrollment.</span></div>
        <div><CheckCircle2/><span>Work toward clear written balances, holds, deadlines, offices, and next steps.</span></div>
        <div><CheckCircle2/><span>Consider consent-based coordination with EFF for student cases.</span></div>
        <div><CheckCircle2/><span>Use privacy-protected outcome learning to improve student support.</span></div>
      </aside>
    </div></section>
    <section className="section partner-student-cta"><div className="shell"><ShieldCheck/><div><div className="eyebrow">For students at {partner.display_name}</div><h2>Is something threatening your education?</h2><p>Open a private EFF case for help organizing the problem, finding the responsible office, preparing documents, and requesting consent-based follow-up.</p></div><Link className="button light" href="/resources/student-help">Open the Student Help Desk <ArrowRight size={16}/></Link></div></section>
    <section className="section white"><div className="shell partner-disclaimer"><strong>What partner status means</strong><p>Participation is voluntary and free. It is not accreditation, an endorsement of every institutional practice, a guarantee of funding, or a promise that a school will reverse a decision. The institution retains authority over its policies and decisions. EFF remains an independent nonprofit support and advocacy organization.</p></div></section>
  </main>;
}
