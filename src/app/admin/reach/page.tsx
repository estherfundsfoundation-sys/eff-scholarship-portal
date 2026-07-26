import Link from "next/link";
import {requireAdmin} from "@/lib/auth/staff";
import {createAdminClient} from "@/lib/supabase/admin";
import {addReachResource, reviewReachActivity, setReachResourceActive} from "./actions";

export default async function ReachAdminPage({searchParams}:{searchParams:Promise<{error?:string;resource?:string;reviewed?:string}>}) {
  const params = await searchParams;
  await requireAdmin();
  const admin = createAdminClient();
  const [{data: ambassadors}, {data: resources}, {data: submissions}] = await Promise.all([
    admin.from("reach_ambassadors").select("id,email,full_name,institution,active,invited_at,claimed_at").order("full_name",{nullsFirst:false}),
    admin.from("reach_resources").select("id,title,description,category,resource_url,active,created_at").order("created_at",{ascending:false}),
    admin.from("reach_activity_submissions").select("id,title,activity_type,campus,activity_date,description,students_reached,photo_paths,status,review_note,created_at,reach_ambassadors(full_name,email,institution)").order("created_at",{ascending:false}),
  ]);
  const claimed = ambassadors?.filter(item=>item.claimed_at).length ?? 0;
  const pending = submissions?.filter(item=>item.status==="pending_review").length ?? 0;
  return <main className="section white"><div className="shell">
    <Link className="card-link" href="/admin">â† Command center</Link>
    <div className="eyebrow">REACH National Office</div><h2>Ambassadors, resources, and campus impact</h2><p>Manage the approved ambassador roster, publish workshop tools, and review every photo before it appears publicly.</p>
    {params.error && <div className="notice error-text">{params.error}</div>}{params.resource && <div className="notice">Resource added.</div>}{params.reviewed && <div className="notice">Review saved.</div>}
    <div className="stats admin-stats"><div className="stat"><strong>{ambassadors?.length ?? 0}</strong><span>Approved ambassadors</span></div><div className="stat"><strong>{claimed}</strong><span>Accounts claimed</span></div><div className="stat"><strong>{pending}</strong><span>Activities awaiting review</span></div></div>

    <div className="admin-columns" style={{marginTop:30}}>
      <form action={addReachResource} className="card stack"><div className="eyebrow">Resource library</div><h3>Add a workshop or outreach resource</h3><label>Title<input name="title" required maxLength={180}/></label><label>Category<input name="category" defaultValue="Workshop toolkit" maxLength={100}/></label><label>Description<textarea name="description" rows={4} maxLength={800}/></label><label>Secure resource URL<input name="resourceUrl" type="url" required placeholder="https://..."/></label><button className="button">Add resource</button></form>
      <section className="card"><div className="eyebrow">Invitation progress</div><h3>{claimed} of {ambassadors?.length ?? 0} accounts claimed</h3><p className="muted">Claim access is tied to the verified email address on the approved ambassador list.</p><div className="table-wrap" style={{maxHeight:350,overflow:"auto"}}><table><thead><tr><th>Ambassador</th><th>Status</th></tr></thead><tbody>{ambassadors?.map(item=><tr key={item.id}><td>{item.full_name||item.email}<br/><small>{item.institution||item.email}</small></td><td>{item.claimed_at?"Claimed":item.invited_at?"Invited":"Ready to invite"}</td></tr>)}</tbody></table></div></section>
    </div>

    <section style={{marginTop:36}}><div className="eyebrow">Active resource library</div><h3>Ambassador resources</h3>{resources?.length ? resources.map(resource=><article className="card" key={resource.id} style={{marginTop:12}}><div className="section-head"><div><strong>{resource.title}</strong><p className="muted">{resource.category} Â· {resource.active?"Visible":"Hidden"}</p></div><form action={setReachResourceActive}><input type="hidden" name="resourceId" value={resource.id}/><input type="hidden" name="active" value={resource.active?"false":"true"}/><button className="button outline">{resource.active?"Hide":"Show"}</button></form></div><p>{resource.description}</p><a className="card-link" href={resource.resource_url} target="_blank" rel="noopener noreferrer">Open resource</a></article>) : <div className="card">No resources added yet.</div>}</section>

    <section style={{marginTop:36}}><div className="eyebrow">Private review queue</div><h3>Campus activity submissions</h3>{submissions?.length ? submissions.map(item=>{const ambassador=item.reach_ambassadors as unknown as {full_name:string|null;email:string;institution:string|null};const photoCount=Array.isArray(item.photo_paths)?item.photo_paths.length:0;return <article className="card" key={item.id} style={{marginTop:14}}><div className="section-head"><div><div className="eyebrow">{item.status.replaceAll("_"," ")}</div><h3>{item.title}</h3><p className="muted">{ambassador?.full_name||ambassador?.email} Â· {item.campus} Â· {item.activity_date}</p></div><span className="status">{photoCount} photo{photoCount===1?"":"s"}</span></div><p>{item.description}</p><p><strong>Students reached:</strong> {item.students_reached ?? "Not reported"}</p><form action={reviewReachActivity} className="stack"><input type="hidden" name="submissionId" value={item.id}/><label>Review note<textarea name="reviewNote" rows={3} defaultValue={item.review_note??""}/></label><label>Decision<select name="decision" defaultValue={item.status==="pending_review"?"approved":item.status}><option value="approved">Approve activity (keep photos private)</option><option value="published">Approve and publish submitted photos</option><option value="changes_requested">Request changes</option><option value="not_published">Review and keep private</option></select></label><button className="button">Save review</button></form></article>}) : <div className="card">No activity submissions yet.</div>}</section>
  </div></main>;
}

