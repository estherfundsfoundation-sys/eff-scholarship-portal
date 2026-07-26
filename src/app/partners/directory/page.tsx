import type {Metadata} from "next";
import Link from "next/link";
import {ArrowRight,BadgeCheck,Building2,MapPin,Search} from "lucide-react";
import {createAdminClient} from "@/lib/supabase/admin";

export const metadata:Metadata={title:"EFF Partner School Directory",description:"Find U.S. colleges participating in the Every Future Fulfilled College Continuity Partnership."};
export const dynamic="force-dynamic";
type Partner={id:string;slug:string;display_name:string;institution_type:string;city:string|null;state:string|null;website_url:string|null;logo_url:string|null;public_summary:string|null;designation:"partner"|"institute";status:string};

export default async function PartnerDirectory({searchParams}:{searchParams:Promise<{q?:string;state?:string}>}){
  const {q="",state=""}=await searchParams;
  let partners:Partner[]=[];
  try{
    const admin=createAdminClient();
    let query=admin.from("eff_partner_institutions")
      .select("id,slug,display_name,institution_type,city,state,website_url,logo_url,public_summary,designation,status")
      .in("status",["approved","active"]).eq("public_profile",true).order("display_name");
    if(q.trim())query=query.ilike("display_name",`%${q.trim().slice(0,80)}%`);
    if(state.trim())query=query.eq("state",state.trim().slice(0,2).toUpperCase());
    const {data}=await query;partners=data??[];
  }catch{}
  return <main className="partner-directory-page">
    <section className="partner-directory-hero"><div className="shell"><Link className="back-link" href="/partners">← College Continuity Partnership</Link><div className="eyebrow">National partner directory</div><h1>Schools committed to <span>stepping in.</span></h1><p>Every public institution below has completed EFF verification and committed to a student-continuity pathway. Partner status is voluntary and free.</p>
      <form className="partner-directory-search"><label><Search/><span className="sr-only">Search partner schools</span><input name="q" defaultValue={q} placeholder="Search a partner school"/></label><label><MapPin/><span className="sr-only">State</span><input name="state" defaultValue={state} maxLength={2} placeholder="State"/></label><button className="button">Search</button></form>
    </div></section>
    <section className="section white"><div className="shell">
      <div className="partner-directory-summary"><strong>{partners.length}</strong><span>matching partner school{partners.length===1?"":"s"}</span><Link href="/partners/join">Add your institution <ArrowRight size={16}/></Link></div>
      {partners.length?<div className="partner-directory-grid">{partners.map(partner=><article className="partner-school-card" key={partner.id}>
        <div className="partner-logo-frame">{partner.logo_url?<img src={partner.logo_url} alt={`${partner.display_name} logo`}/>:<Building2/>}</div>
        <div className="partner-card-designation"><BadgeCheck/>{partner.designation==="institute"?"EFF Institute for Student Continuity":"EFF Partner Campus"}</div>
        <h2>{partner.display_name}</h2>
        <p className="partner-location">{partner.city&&partner.state?`${partner.city}, ${partner.state}`:partner.state??partner.institution_type}</p>
        <p>{partner.public_summary}</p>
        <Link className="card-link" href={`/partners/${partner.slug}`}>View partnership profile <ArrowRight size={16}/></Link>
      </article>)}</div>:<div className="partner-empty-state"><Building2/><h2>{q||state?"No matching partner schools yet.":"Founding partner profiles are coming."}</h2><p>{q||state?"Try another search or invite this institution to become a free EFF Partner Campus.":"EFF is inviting the first U.S. colleges to join the free College Continuity Partnership."}</p><Link className="button" href="/partners/join">Become a founding partner</Link></div>}
    </div></section>
  </main>;
}
