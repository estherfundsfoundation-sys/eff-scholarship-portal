import Link from "next/link";
import {requireStaff} from "@/lib/auth/staff";

const exportsList=[['applications','Applications'],['reviews','Review assignments and scores'],['awards','Awards and disbursements'],['legacy','Legacy applicants'],['scholarships','External scholarships'],['communications','Communications'],['importer-runs','Importer runs'],['exceptions','Importer exceptions']];
const statusNames=["draft","applied","review_by_admin","additional_information_needed","approved","denied","withdrawn","archived"];
const legacyNames=["staged","committed","invited","claimed","excluded","error"];
const pct=(part:number,total:number)=>total?`${Math.round(part/total*100)}%`:"0%";

export default async function Reports(){
  const {supabase}=await requireStaff();
  const [{count:all},{count:submitted},{count:awards},statusResults,legacyResults,{data:cycles}]=await Promise.all([
    supabase.from("applications").select("id",{count:"exact",head:true}),
    supabase.from("applications").select("id",{count:"exact",head:true}).not("submitted_at","is",null),
    supabase.from("awards").select("id",{count:"exact",head:true}),
    Promise.all(statusNames.map(status=>supabase.from("applications").select("id",{count:"exact",head:true}).eq("status",status))),
    Promise.all(legacyNames.map(status=>supabase.from("legacy_application_records").select("id",{count:"exact",head:true}).eq("status",status))),
    supabase.from("program_cycles").select("id,name,programs(name)").order("opens_at",{ascending:false}),
  ]);
  const total=all??0;const submittedTotal=submitted??0;
  const statuses=statusNames.map((name,index)=>[name,statusResults[index].count??0] as const).filter(([,count])=>count>0);
  const legacy=Object.fromEntries(legacyNames.map((name,index)=>[name,legacyResults[index].count??0])) as Record<string,number>;
  const legacyTotal=Object.values(legacy).reduce((sum,value)=>sum+value,0);const invitedPeople=legacy.invited+legacy.claimed;
  const cycleCounts=await Promise.all((cycles??[]).map(async cycle=>({cycle,count:(await supabase.from("applications").select("id",{count:"exact",head:true}).eq("cycle_id",cycle.id)).count??0})));
  return <main className="section white"><div className="shell"><Link href="/admin" className="card-link">← Command center</Link><div className="eyebrow">Applicant pool intelligence</div><h2>Understand the full applicant pool</h2><p className="muted">These totals use exact database counts. Legacy records are people imported from Name Your Need; portal applications are the records applicants can now continue and submit online.</p>
    <div className="stats report-stats">{[["Legacy people",legacyTotal],["Invited people",invitedPeople],["Accounts claimed",legacy.claimed],["Portal applications",total],["Submitted",submittedTotal],["Still in draft",statuses.find(([name])=>name==="draft")?.[1]??0],["Awards created",awards??0],["Submission rate",pct(submittedTotal,total)]].map(([label,value])=><div className="stat" key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
    <div className="admin-columns report-panels"><section className="card"><h3>Name Your Need conversion</h3><div className="report-row"><span>Imported legacy records</span><strong>{legacyTotal}</strong></div><div className="report-row"><span>Invited, not yet claimed</span><strong>{legacy.invited}</strong></div><div className="report-row"><span>Claimed portal accounts</span><strong>{legacy.claimed}</strong></div><div className="report-row"><span>Claim rate among invited people</span><strong>{pct(legacy.claimed,invitedPeople)}</strong></div><p className="muted" style={{marginTop:16}}>Email delivery totals can be higher than the number of people because reminders and retries are separate messages.</p></section>
      <section className="card"><h3>Current application status</h3>{statuses.map(([status,count])=><div className="report-row" key={status}><span>{status.replaceAll("_"," ")}</span><strong>{count}</strong></div>)}</section></div>
    <section className="card" style={{marginTop:24}}><h3>Programs and cycles</h3>{cycleCounts.filter(item=>item.count>0).map(({cycle,count})=>{const program=cycle.programs as unknown as {name:string}|null;return <div className="report-row" key={cycle.id}><span>{program?.name??"Unknown program"} · {cycle.name}</span><strong>{count}</strong></div>})}<p style={{marginTop:20}}><Link className="button" href="/admin/applications">Browse all applications</Link> <Link className="button outline" href="/admin/imports">View legacy import</Link></p></section>
    <div className="notice"><strong>Privacy safeguard:</strong> Exports contain personal information. Download only for authorized EFF work, store securely, and delete according to the approved retention schedule. Every export is audited.</div><div className="cards" style={{marginTop:24}}>{exportsList.map(([kind,title])=><Link className="card" href={`/api/admin/export/${kind}`} key={kind}><h3>{title}</h3><span className="button">Download CSV</span></Link>)}</div></div></main>
}
