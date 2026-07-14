import Link from "next/link";
import {requireAdmin} from "@/lib/auth/staff";
import {queueInvitations} from "./actions";

export default async function Imports() {
  const {supabase} = await requireAdmin();
  const statuses = ["staged", "committed", "invited", "claimed", "excluded", "error"];
  const totals = await Promise.all(statuses.map(status => supabase.from("legacy_application_records").select("id", {count: "exact", head: true}).eq("status", status)));
  const [{data: jobs}, {count: queued}, {count: sent}, {count: failed}] = await Promise.all([
    supabase.from("import_jobs").select("id,status,created_at,committed_at,file_hash").order("created_at", {ascending: false}),
    supabase.from("messages").select("id", {count: "exact", head: true}).eq("status", "queued"),
    supabase.from("messages").select("id", {count: "exact", head: true}).eq("status", "sent"),
    supabase.from("messages").select("id", {count: "exact", head: true}).eq("status", "failed"),
  ]);
  return <main className="section white"><div className="shell"><Link href="/admin" className="card-link">← Command center</Link><div className="eyebrow">Name Your Need</div><h2>Legacy applicant import</h2><p className="muted">Private staging, duplicate protection, paced invitations, and secure application claiming.</p><div className="stats admin-stats">{statuses.slice(0, 4).map((status, index) => <div className="stat" key={status}><strong>{totals[index].count ?? 0}</strong><span>{status}</span></div>)}</div><div className="notice"><strong>Privacy safeguard:</strong> Raw spreadsheet values remain restricted. Applicants receive single-use links; passwords, essays, and documents are never emailed.</div><section className="card" style={{marginTop: 24}}><h3>Queue invitation batch</h3><p className="muted">This prepares secure invitations. The delivery worker releases up to 25 every five minutes, with automatic retry and backoff. Duplicate and suppressed addresses are excluded.</p><p><strong>{queued ?? 0}</strong> queued · <strong>{sent ?? 0}</strong> sent · <strong>{failed ?? 0}</strong> need attention</p><form action={queueInvitations} className="admin-filter"><label>Batch size<input type="number" name="limit" min="1" max="5000" defaultValue="100"/></label><button className="button">Queue invitations</button></form></section><div className="table-wrap" style={{marginTop: 24}}><table><thead><tr><th>Import job</th><th>Status</th><th>Created</th><th>Committed</th></tr></thead><tbody>{jobs?.map(job => <tr key={job.id}><td>{job.id}<br/><small>File {job.file_hash.slice(0, 12)}…</small></td><td>{job.status}</td><td>{new Date(job.created_at).toLocaleString()}</td><td>{job.committed_at ? new Date(job.committed_at).toLocaleString() : "—"}</td></tr>)}</tbody></table></div></div></main>;
}
