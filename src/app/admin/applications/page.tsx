import Link from "next/link";
import {requireStaff} from "@/lib/auth/staff";
import {bulkTransitionApplications} from "./actions";
import {BulkSelectionControls} from "./bulk-selection-controls";

type Params={q?:string;status?:string;cycle?:string;need?:string;min_amount?:string;max_amount?:string;urgent?:string;page?:string;per_page?:string;bulk_updated?:string;bulk_failed?:string;bulk_error?:string;bulk_action?:string};
type Answer={question_key:string;value:unknown};
type ProgramCycle={id:string;name:string;programs:{name:string}|null};

const money=(value:unknown)=>{const parsed=Number(String(value??"").replace(/[^0-9.]/g,""));return Number.isFinite(parsed)?parsed:0};
const answer=(answers:Answer[],key:string)=>answers.find(item=>item.question_key===key)?.value;
const excerpt=(value:string,max=180)=>value.length>max?`${value.slice(0,max).trim()}…`:value;
const statusLabel=(status:string)=>({
  applied:"New submission",
  review_by_admin:"Under review",
  additional_information_needed:"Needs correction",
  approved:"Approved",
  denied:"Denied",
  withdrawn:"Withdrawn",
  archived:"Archived",
  draft:"Draft",
}[status]??status.replaceAll("_"," "));

export default async function ApplicationsAdmin({searchParams}:{searchParams:Promise<Params>}){
  const params=await searchParams;
  const {supabase,roles}=await requireStaff();
  const canBulk=roles.some(item=>["program_admin","super_admin"].includes(item.role));
  const allowedPageSizes=[50,100,250];
  const requestedPageSize=Number(params.per_page)||100;
  const pageSize=allowedPageSizes.includes(requestedPageSize)?requestedPageSize:100;
  const page=Math.max(1,Number(params.page)||1);
  const from=(page-1)*pageSize;
  const queueStatuses=["applied","review_by_admin","additional_information_needed","approved","denied","draft"] as const;
  const [queueResults,cyclesResult]=await Promise.all([
    Promise.all(queueStatuses.map(status=>supabase.from("applications").select("id",{count:"exact",head:true}).eq("status",status))),
    supabase.from("program_cycles").select("id,name,programs(name)").order("name"),
  ]);

  let query=supabase.from("applications").select("id,status,submitted_at,updated_at,profiles!applications_applicant_id_fkey(legal_name,primary_email,institution),program_cycles(id,name,programs(name)),application_answers(question_key,value)",{count:"exact"}).order("updated_at",{ascending:false}).range(from,from+pageSize-1);
  if(params.status)query=query.eq("status",params.status);
  if(params.cycle)query=query.eq("program_cycle_id",params.cycle);
  const {data,error,count}=await query;
  if(error)return <main className="section white"><div className="shell"><Link href="/admin" className="card-link">← Command center</Link><div className="notice error-text" style={{marginTop:24}}><strong>The application workspace could not load.</strong><p>Please try again. No application records were changed.</p><Link className="button outline" href="/admin/applications">Retry workspace</Link></div></div></main>;

  const min=params.min_amount?Number(params.min_amount):null;
  const max=params.max_amount?Number(params.max_amount):null;
  const urgentWords=/urgent|emergency|eviction|past due|shut.?off|disconnect|deadline|food|housing|homeless|crisis|tuition balance/i;
  const filtered=(data??[]).filter(item=>{
    const answers=(item.application_answers as unknown as Answer[])??[];
    const amount=money(answer(answers,"amount_requested"));
    const need=String(answer(answers,"need_category")??"");
    const narrative=String(answer(answers,"financial_need_description")??"");
    if(params.q&&!JSON.stringify(item).toLowerCase().includes(params.q.toLowerCase()))return false;
    if(params.need&&need!==params.need)return false;
    if(min!==null&&amount<min)return false;
    if(max!==null&&amount>max)return false;
    if(params.urgent==="yes"&&!urgentWords.test(`${need} ${narrative}`))return false;
    return true;
  });
  const statuses=["applied","review_by_admin","additional_information_needed","approved","denied","withdrawn","archived"];
  const needs=["Tuition or fees","Housing or utilities","Food","Transportation","Books or supplies","Technology","Childcare","Health or wellness","Other"];
  const cycles=(cyclesResult.data??[]) as unknown as ProgramCycle[];

  return <main className="section white"><div className="shell">
    <Link href="/admin" className="card-link">← Command center</Link>
    <div className="section-head">
      <div><div className="eyebrow">Application review workspace</div><h2>Review, communicate, and decide in one place</h2><p className="muted">Filter by scholarship, open the student record, request corrections, assign reviewers, and apply audited decisions.</p></div>
      <div className="admin-workspace-actions">{filtered[0]&&<Link className="button" href={`/admin/applications/${filtered[0].id}`}>Review next application</Link>}<Link className="button outline" href="/admin/communications">Email delivery</Link><Link className="button outline" href="/admin/applicant-pool">Applicant pool</Link></div>
    </div>
    <div className="stats application-queue-stats">{queueStatuses.map((status,index)=><Link className={`stat ${params.status===status?"active":""}`} href={{pathname:"/admin/applications",query:{status,per_page:String(pageSize),...(params.cycle?{cycle:params.cycle}:{})}}} key={status}><strong>{queueResults[index].count??0}</strong><span>{statusLabel(status)}</span></Link>)}</div>
    {params.bulk_updated&&<div className="notice"><strong>{params.bulk_updated} application(s) updated.</strong> {params.bulk_action==="additional_information_needed"?"Correction requests":"Student notices"} were queued once through the protected email system.{Number(params.bulk_failed)>0?` ${params.bulk_failed} were skipped because the selected transition was not allowed.`:""}</div>}
    {params.bulk_error&&<div className="notice error-text"><strong>Bulk action not completed:</strong> {params.bulk_error}</div>}

    <form className="application-filters">
      <label>Search<input name="q" defaultValue={params.q} placeholder="Name, email, school, ID, or answer"/></label>
      <label>Stage<select name="status" defaultValue={params.status??""}><option value="">All stages</option>{statuses.map(status=><option value={status} key={status}>{statusLabel(status)}</option>)}</select></label>
      <label>Scholarship or cycle<select name="cycle" defaultValue={params.cycle??""}><option value="">All scholarships</option>{cycles.map(cycle=><option value={cycle.id} key={cycle.id}>{cycle.programs?.name??"Program"} — {cycle.name}</option>)}</select></label>
      <label>Need<select name="need" defaultValue={params.need??""}><option value="">All need types</option>{needs.map(need=><option key={need}>{need}</option>)}</select></label>
      <label>Minimum requested<input name="min_amount" type="number" min="0" defaultValue={params.min_amount} placeholder="$0"/></label>
      <label>Maximum requested<input name="max_amount" type="number" min="0" defaultValue={params.max_amount} placeholder="No maximum"/></label>
      <label className="check"><input name="urgent" type="checkbox" value="yes" defaultChecked={params.urgent==="yes"}/><span>Show urgency language</span></label>
      <label>Rows<select name="per_page" defaultValue={String(pageSize)}>{allowedPageSizes.map(size=><option key={size} value={size}>{size} per page</option>)}</select></label>
      <div className="filter-actions"><button className="button">Apply filters</button><Link className="button outline" href="/admin/applications">Clear</Link></div>
    </form>

    <form action={bulkTransitionApplications}>
      {canBulk&&<section className="card bulk-workspace"><div className="section-head"><div><div className="eyebrow">Bulk actions</div><h3>Update a selected group safely</h3></div><span className="status">Maximum 250</span></div><BulkSelectionControls count={filtered.length}/></section>}
      {filtered.length?<div className="table-wrap application-table"><table><thead><tr>{canBulk&&<th>Select</th>}<th>Applicant</th><th>Scholarship and summary</th><th>Need</th><th>Requested</th><th>Stage</th><th>Submitted</th><th>Action</th></tr></thead><tbody>{filtered.map(item=>{
        const profile=item.profiles as unknown as {legal_name:string|null;primary_email:string|null;institution:string|null};
        const answers=(item.application_answers as unknown as Answer[])??[];
        const need=String(answer(answers,"need_category")??"Not provided");
        const amount=money(answer(answers,"amount_requested"));
        const narrative=String(answer(answers,"financial_need_description")??"").trim();
        const cycle=item.program_cycles as unknown as ProgramCycle|null;
        const urgent=urgentWords.test(`${need} ${narrative}`);
        return <tr key={item.id}>{canBulk&&<td><input aria-label={`Select ${profile?.legal_name??"application"}`} type="checkbox" name="application_ids" value={item.id}/></td>}<td><strong>{profile?.legal_name??"Applicant"}</strong><br/><small>{profile?.primary_email}<br/>{profile?.institution}<br/>{item.id}</small></td><td><strong>{cycle?.programs?.name??"Program not listed"}</strong><br/><small>{cycle?.name}<br/>{narrative?excerpt(narrative):"No financial-need summary provided."}</small></td><td>{need}{urgent&&<><br/><span className="status status-additional_information_needed">Urgency language</span></>}</td><td>{amount?`$${amount.toLocaleString()}`:"—"}</td><td><span className={`status status-${item.status}`}>{statusLabel(item.status)}</span></td><td>{item.submitted_at?new Date(item.submitted_at).toLocaleDateString():"—"}</td><td><Link className="button outline" href={`/admin/applications/${item.id}`}>View and act</Link></td></tr>;
      })}</tbody></table></div>:<div className="card empty-review-state"><h3>No applications match these filters.</h3><p className="muted">Clear one or more filters to return to the full workspace.</p><Link className="button outline" href="/admin/applications">Clear filters</Link></div>}
    </form>
    <p className="muted">Showing {filtered.length} on page {page} of {Math.max(1,Math.ceil((count??0)/pageSize))} · {count??0} application(s) in the selected scholarship and stage. “Urgency language” is a review aid based on the applicant’s own words; it is not an eligibility or award decision.</p>
    <div className="review-pagination">{page>1&&<Link className="button outline" href={{pathname:"/admin/applications",query:{...params,page:String(page-1)}}}>← Previous</Link>}{from+pageSize<(count??0)&&<Link className="button outline" href={{pathname:"/admin/applications",query:{...params,page:String(page+1)}}}>Next →</Link>}</div>
  </div></main>;
}
