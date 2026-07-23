import Link from "next/link";
import {requireAdmin} from "@/lib/auth/staff";
import {queueInvitations,resendInvitation} from "./actions";

export default async function Imports({searchParams}:{searchParams:Promise<{email?:string}>}){
  const {supabase}=await requireAdmin();
  const email=(await searchParams).email?.trim().toLowerCase()??"";
  const statuses=["staged","committed","invited","claimed","excluded","error"];
  const totals=await Promise.all(statuses.map(status=>supabase.from("legacy_application_records").select("id",{count:"exact",head:true}).eq("status",status)));
  const [{data:jobs},{count:queued},{count:sent},{count:failed}]=await Promise.all([
    supabase.from("import_jobs").select("id,status,created_at,committed_at,file_hash").order("created_at",{ascending:false}),
    supabase.from("messages").select("id",{count:"exact",head:true}).eq("status","queued"),
    supabase.from("messages").select("id",{count:"exact",head:true}).eq("status","sent"),
    supabase.from("messages").select("id",{count:"exact",head:true}).eq("status","failed"),
  ]);
  const {data:records}=email
    ?await supabase.from("legacy_application_records").select("id,email,status,original_submitted_at,application_id").ilike("email",email).order("created_at",{ascending:false})
    :{data:[]};

  return <main className="section white"><div className="shell">
    <Link href="/admin" className="card-link">← Command center</Link><div className="eyebrow">Name Your Need</div><h2>Legacy applicant import</h2><p className="muted">Private staging, duplicate protection, paced invitations, and secure application claiming.</p>
    <div className="stats admin-stats">{statuses.slice(0,4).map((status,index)=><div className="stat" key={status}><strong>{totals[index].count??0}</strong><span>{status}</span></div>)}</div>
    <div className="notice"><strong>Privacy safeguard:</strong> Raw spreadsheet values remain restricted. Applicants receive single-use links; passwords, essays, and documents are never emailed.</div>
    <section className="card" style={{marginTop:24}}><h3>Claim invitation recovery</h3><p className="muted">Find one transferred application by its exact email. Resending cancels older unused links, creates a private 14-day link, and preserves the application contents and original submission date.</p>
      <form method="get" className="admin-filter"><label>Applicant email<input name="email" type="email" defaultValue={email} required/></label><button className="button">Find application</button></form>
      {email&&records?.length===0?<p className="muted">No transferred application was found for that email.</p>:null}
      {records?.map(record=><div className="notice" key={record.id} style={{marginTop:16}}><strong>{record.email}</strong><br/>Status: {record.status} · Original date: {record.original_submitted_at?new Date(record.original_submitted_at).toLocaleString():"Not recorded"}<br/><small>Record {record.id}</small>{record.status!=="claimed"&&record.status!=="excluded"&&record.status!=="error"?<form action={resendInvitation} style={{marginTop:12}}><input type="hidden" name="legacy_record_id" value={record.id}/><button className="button">Generate and resend private claim link</button></form>:<p className="muted">{record.status==="claimed"?"This application is already connected; no new claim link is needed.":"This record needs staff review before an invitation can be sent."}</p>}</div>)}
    </section>
    <section className="card" style={{marginTop:24}}><h3>Queue invitation batch</h3><p className="muted">This prepares secure invitations. The delivery worker releases up to 25 every five minutes, with automatic retry and backoff. Duplicate and suppressed addresses are excluded.</p><p><strong>{queued??0}</strong> queued · <strong>{sent??0}</strong> sent · <strong>{failed??0}</strong> need attention</p><form action={queueInvitations} className="admin-filter"><label>Batch size<input type="number" name="limit" min="1" max="5000" defaultValue="100"/></label><button className="button">Queue invitations</button></form></section>
    <div className="table-wrap" style={{marginTop:24}}><table><thead><tr><th>Import job</th><th>Status</th><th>Created</th><th>Committed</th></tr></thead><tbody>{jobs?.map(job=><tr key={job.id}><td>{job.id}<br/><small>File {job.file_hash.slice(0,12)}…</small></td><td>{job.status}</td><td>{new Date(job.created_at).toLocaleString()}</td><td>{job.committed_at?new Date(job.committed_at).toLocaleString():"—"}</td></tr>)}</tbody></table></div>
  </div></main>;
}
