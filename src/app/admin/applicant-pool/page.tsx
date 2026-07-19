import Link from "next/link";
import {requireStaff} from "@/lib/auth/staff";

const statuses=["draft","applied","review_by_admin","additional_information_needed","approved","denied","withdrawn","archived"] as const;
const legacyStatuses=["staged","committed","invited","claimed","excluded","error"] as const;
const pct=(part:number,total:number)=>total?`${Math.round(part/total*100)}%`:"0%";
const words=(value:string)=>value.replaceAll("_"," ");

export default async function ApplicantPool(){
  const {supabase}=await requireStaff();
  const [{count:all},{count:submitted},{count:awards},statusResults,legacyResults,{data:cycles},{data:programs}]=await Promise.all([
    supabase.from("applications").select("id",{count:"exact",head:true}),
    supabase.from("applications").select("id",{count:"exact",head:true}).not("submitted_at","is",null),
    supabase.from("awards").select("id",{count:"exact",head:true}),
    Promise.all(statuses.map(status=>supabase.from("applications").select("id",{count:"exact",head:true}).eq("status",status))),
    Promise.all(legacyStatuses.map(status=>supabase.from("legacy_application_records").select("id",{count:"exact",head:true}).eq("status",status))),
    supabase.from("program_cycles").select("id,name,program_id").order("opens_at",{ascending:false}),
    supabase.from("programs").select("id,name"),
  ]);

  const total=all??0;
  const submittedTotal=submitted??0;
  const statusCounts=Object.fromEntries(statuses.map((status,index)=>[status,statusResults[index].count??0])) as Record<typeof statuses[number],number>;
  const legacy=Object.fromEntries(legacyStatuses.map((status,index)=>[status,legacyResults[index].count??0])) as Record<typeof legacyStatuses[number],number>;
  const legacyTotal=Object.values(legacy).reduce((sum,value)=>sum+value,0);
  const invitedPeople=legacy.invited+legacy.claimed;
  const cycleCounts=await Promise.all((cycles??[]).map(async cycle=>({cycle,count:(await supabase.from("applications").select("id",{count:"exact",head:true}).eq("cycle_id",cycle.id)).count??0})));

  return <main className="section white"><div className="shell">
    <Link href="/admin" className="card-link">← Command center</Link>
    <div className="section-head"><div><div className="eyebrow">Applicant Pool Dashboard</div><h2>Understand the entire student pool</h2><p className="muted">Clear, exact totals for Name Your Need records, portal accounts, applications, review stages, programs, and awards.</p></div><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><Link className="button" href="/admin/applications">Browse applications</Link><Link className="button outline" href="/admin/applicants">Search students</Link></div></div>

    <div className="stats report-stats">{[
      ["Name Your Need people",legacyTotal],
      ["Portal applications",total],
      ["Submitted",submittedTotal],
      ["Still in draft",statusCounts.draft],
      ["Needs staff review",statusCounts.applied+statusCounts.review_by_admin],
      ["Awards created",awards??0],
      ["Claimed accounts",legacy.claimed],
      ["Submission rate",pct(submittedTotal,total)],
    ].map(([label,value])=><div className="stat" key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>

    <section className="card" style={{marginTop:24}}><div className="eyebrow">How the numbers connect</div><h3>People become portal applicants in three steps</h3><div className="cards" style={{marginTop:18}}>
      <article className="card"><strong style={{fontSize:30}}>{legacyTotal.toLocaleString()}</strong><h3>1. Imported people</h3><p>Name Your Need records brought into the new portal. These are people, not necessarily submitted portal applications.</p><Link className="card-link" href="/admin/imports">Open legacy records →</Link></article>
      <article className="card"><strong style={{fontSize:30}}>{legacy.claimed.toLocaleString()}</strong><h3>2. Claimed accounts</h3><p>Students who used their invitation and connected their record to a secure portal account.</p><span className="muted">{pct(legacy.claimed,invitedPeople)} of invited people claimed</span></article>
      <article className="card"><strong style={{fontSize:30}}>{total.toLocaleString()}</strong><h3>3. Portal applications</h3><p>Application records in the portal, including drafts and submitted applications. One student may have more than one application.</p><Link className="card-link" href="/admin/applications">Browse applications →</Link></article>
    </div></section>

    <div className="admin-columns report-panels" style={{marginTop:24}}>
      <section className="card"><h3>Current review status</h3>{statuses.filter(status=>statusCounts[status]>0).map(status=><div className="report-row" key={status}><span>{words(status)}</span><strong>{statusCounts[status].toLocaleString()}</strong></div>)}<p style={{marginTop:20}}><Link className="button" href="/admin/applications">Filter and review</Link></p></section>
      <section className="card"><h3>Name Your Need progress</h3><div className="report-row"><span>Imported records</span><strong>{legacyTotal.toLocaleString()}</strong></div><div className="report-row"><span>Invited, not claimed</span><strong>{legacy.invited.toLocaleString()}</strong></div><div className="report-row"><span>Claimed portal accounts</span><strong>{legacy.claimed.toLocaleString()}</strong></div><div className="report-row"><span>Claim rate</span><strong>{pct(legacy.claimed,invitedPeople)}</strong></div><p style={{marginTop:20}}><Link className="button outline" href="/admin/imports">Open import workspace</Link></p></section>
    </div>

    <section className="card" style={{marginTop:24}}><h3>Applications by program and cycle</h3>{cycleCounts.filter(item=>item.count>0).map(({cycle,count})=>{const program=programs?.find(item=>item.id===cycle.program_id);return <div className="report-row" key={cycle.id}><span>{program?.name??"Unknown program"} · {cycle.name}</span><strong>{count.toLocaleString()}</strong></div>})}<p style={{marginTop:20,display:"flex",gap:10,flexWrap:"wrap"}}><Link className="button" href="/admin/applications">Browse all applications</Link><Link className="button outline" href="/admin/reports">Reports & CSV exports</Link></p></section>

    <div className="notice"><strong>Quick guide:</strong> Use <em>Search students</em> when you know a person’s name or email. Use <em>Browse applications</em> to filter and review applications. Use <em>Name Your Need records</em> to see imported students who may not have claimed their accounts yet.</div>
  </div></main>;
}
