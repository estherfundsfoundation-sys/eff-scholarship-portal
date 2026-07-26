import Link from "next/link";
import {BadgeCheck,Building2,Clock3,ExternalLink,ShieldCheck} from "lucide-react";
import {requireAdmin} from "@/lib/auth/staff";
import {reviewPartner} from "./actions";

export default async function AdminPartners({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}){
  const query=await searchParams;
  const {supabase}=await requireAdmin();
  const {data:partners}=await supabase.from("eff_partner_institutions").select("*").order("created_at",{ascending:false});
  const summary=[
    ["Pending",partners?.filter(x=>x.status==="pending").length??0,Clock3],
    ["Approved",partners?.filter(x=>x.status==="approved").length??0,ShieldCheck],
    ["Public",partners?.filter(x=>x.status==="active"&&x.public_profile).length??0,BadgeCheck]
  ] as const;
  return <main className="section white"><div className="shell">
    <Link className="card-link" href="/admin">← Command center</Link>
    <div className="eyebrow">College Continuity Partnership</div><h2>Institution applications</h2>
    <p className="muted">Registrations activate and appear publicly immediately. Review official institution identity, website, logo ownership, and readiness commitments; pause or remove any profile that raises a concern.</p>
    {query.saved&&<div className="notice success-text">Partnership status updated.</div>}
    {query.error&&<div className="notice error-text">{query.error}</div>}
    <div className="partner-admin-summary">{summary.map(([label,count,Icon])=><div className="stat" key={label}><Icon/><strong>{count}</strong><span>{label}</span></div>)}</div>
    <div className="partner-admin-list">{partners?.map(partner=><article className="card partner-admin-card" key={partner.id}>
      <div className="partner-admin-heading"><div className="partner-logo-frame">{partner.logo_url?<img src={partner.logo_url} alt=""/>:<Building2/>}</div><div><span className={`partner-status-badge status-${partner.status}`}>{partner.status}</span><h3>{partner.display_name}</h3><p>{[partner.city,partner.state,partner.institution_type].filter(Boolean).join(" · ")}</p></div></div>
      <p>{partner.public_summary}</p>
      <dl><div><dt>Representative</dt><dd>{partner.primary_contact_name}, {partner.primary_contact_title}<br/>{partner.primary_contact_email}</dd></div><div><dt>Liaison</dt><dd>{partner.liaison_department}</dd></div><div><dt>Submitted</dt><dd>{new Date(partner.created_at).toLocaleString()}</dd></div></dl>
      <div className="resource-actions">{partner.website_url&&<a className="resource-link" href={partner.website_url} target="_blank" rel="noreferrer">Official website <ExternalLink size={15}/></a>}{partner.logo_url&&<a className="resource-link" href={partner.logo_url} target="_blank" rel="noreferrer">Inspect logo <ExternalLink size={15}/></a>}</div>
      <form action={reviewPartner} className="partner-admin-review"><input type="hidden" name="institutionId" value={partner.id}/><label>Designation<select name="designation" defaultValue={partner.designation}><option value="partner">Partner Campus</option><option value="institute">Institute for Student Continuity</option></select></label><label>Profile status<select name="decision" defaultValue={partner.status==="pending"?"active":partner.status}><option value="active">Public and active</option><option value="paused">Pause public profile</option><option value="declined">Remove public profile</option></select></label><button className="button">Save decision</button></form>
    </article>)}
    {!partners?.length&&<div className="partner-empty-state"><Building2/><h3>No institution applications yet.</h3><p>Applications submitted through the free partner portal will appear here.</p></div>}
    </div>
  </div></main>;
}
