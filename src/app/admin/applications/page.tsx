import Link from "next/link";
import {requireStaff} from "@/lib/auth/staff";
import {bulkTransitionApplications} from "./actions";
import {BulkSelectionControls} from "./bulk-selection-controls";

type Params={q?:string;status?:string;cycle?:string;need?:string;min_amount?:string;max_amount?:string;urgent?:string;view?:string;sort?:string;page?:string;per_page?:string;bulk_updated?:string;bulk_failed?:string;bulk_error?:string;bulk_action?:string};
type Answer={question_key:string;value:unknown};
type ProgramCycle={id:string;name:string;programs:{name:string}|null};
type Profile={legal_name:string|null;primary_email:string|null;institution:string|null};
type ApplicationRow={id:string;status:string;submitted_at:string|null;updated_at:string;profiles:Profile|null;program_cycles:ProgramCycle|null;application_answers:Answer[]};
type QuickView={key:string;label:string;description:string;status?:string;min_amount?:string;urgent?:string};

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
const chunk=<T,>(items:T[],size:number)=>Array.from({length:Math.ceil(items.length/size)},(_,index)=>items.slice(index*size,(index+1)*size));
const quickViews:QuickView[]=[
  {key:"new",label:"New to review",description:"Recently submitted",status:"applied"},
  {key:"review",label:"Under review",description:"Active review queue",status:"review_by_admin"},
  {key:"corrections",label:"Needs correction",description:"Waiting on students",status:"additional_information_needed"},
  {key:"over_cap",label:"Over $10,000",description:"Requested amount",min_amount:"10000.01"},
  {key:"urgent",label:"Urgent language",description:"Housing, food, deadlines",urgent:"yes"},
  {key:"denied",label:"Denied",description:"Completed decisions",status:"denied"},
];

export default async function ApplicationsAdmin({searchParams}:{searchParams:Promise<Params>}){
  const params=await searchParams;
  const {supabase,roles}=await requireStaff();
  const canBulk=roles.some(item=>["program_admin","super_admin"].includes(item.role));
  const allowedPageSizes=[50,100,250];
  const requestedPageSize=Number(params.per_page)||100;
  const pageSize=allowedPageSizes.includes(requestedPageSize)?requestedPageSize:100;
  const page=Math.max(1,Number(params.page)||1);
  const selectedView=quickViews.find(view=>view.key===params.view);
  const selectedStatus=params.status||selectedView?.status||"";
  const selectedMin=params.min_amount||selectedView?.min_amount||"";
  const selectedUrgent=params.urgent||selectedView?.urgent||"";
  const queueStatuses=["applied","review_by_admin","additional_information_needed","approved","denied","draft"] as const;
  const [queueResults,cyclesResult]=await Promise.all([
    Promise.all(queueStatuses.map(status=>supabase.from("applications").select("id",{count:"exact",head:true}).eq("status",status))),
    supabase.from("program_cycles").select("id,name,programs(name)").order("name"),
  ]);

  const coreRows:ApplicationRow[]=[];
  let loadError="";
  for(let offset=0;;offset+=1000){
    let query=supabase.from("applications").select("id,status,submitted_at,updated_at,profiles!applications_applicant_id_fkey(legal_name,primary_email,institution),program_cycles(id,name,programs(name))").order("updated_at",{ascending:false}).range(offset,offset+999);
    if(selectedStatus)query=query.eq("status",selectedStatus);
    if(params.cycle)query=query.eq("cycle_id",params.cycle);
    const result=await query;
    if(result.error){loadError=result.error.message;break}
    const rows=(result.data??[]) as unknown as Omit<ApplicationRow,"application_answers">[];
    coreRows.push(...rows.map(row=>({...row,application_answers:[]})));
    if(rows.length<1000)break;
  }
  if(loadError)return <main className="section white"><div className="shell"><Link href="/admin" className="card-link">← Command center</Link><div className="notice error-text" style={{marginTop:24}}><strong>The application workspace could not load.</strong><p>Please try again. No application records were changed.</p><Link className="button outline" href="/admin/applications">Retry workspace</Link></div></div></main>;

  const answerResults=await Promise.all(chunk(coreRows.map(item=>item.id),200).map(ids=>supabase.from("application_answers").select("application_id,question_key,value").in("application_id",ids).in("question_key",["amount_requested","need_category","financial_need_description","enrollment_status"])));
  const answersByApplication=new Map<string,Answer[]>();
  answerResults.forEach(result=>(result.data??[]).forEach(row=>{
    const current=answersByApplication.get(row.application_id)??[];
    current.push({question_key:row.question_key,value:row.value});
    answersByApplication.set(row.application_id,current);
  }));
  coreRows.forEach(item=>{item.application_answers=answersByApplication.get(item.id)??[]});

  const min=selectedMin?Number(selectedMin):null;
  const max=params.max_amount?Number(params.max_amount):null;
  const urgentWords=/urgent|emergency|eviction|past due|shut.?off|disconnect|deadline|food|housing|homeless|crisis|tuition balance/i;
  const filtered=coreRows.filter(item=>{
    const answers=(item.application_answers as unknown as Answer[])??[];
    const amount=money(answer(answers,"amount_requested"));
    const need=String(answer(answers,"need_category")??"");
    const narrative=String(answer(answers,"financial_need_description")??"");
    if(params.q&&!JSON.stringify(item).toLowerCase().includes(params.q.toLowerCase()))return false;
    if(params.need&&need!==params.need)return false;
    if(min!==null&&amount<min)return false;
    if(max!==null&&amount>max)return false;
    if(selectedUrgent==="yes"&&!urgentWords.test(`${need} ${narrative}`))return false;
    return true;
  });
  const sort=params.sort??"updated_desc";
  filtered.sort((a,b)=>{
    const aAmount=money(answer(a.application_answers,"amount_requested"));
    const bAmount=money(answer(b.application_answers,"amount_requested"));
    if(sort==="amount_desc")return bAmount-aAmount;
    if(sort==="amount_asc")return aAmount-bAmount;
    if(sort==="submitted_asc")return new Date(a.submitted_at??a.updated_at).getTime()-new Date(b.submitted_at??b.updated_at).getTime();
    if(sort==="name_asc")return String(a.profiles?.legal_name??"").localeCompare(String(b.profiles?.legal_name??""));
    return new Date(b.updated_at).getTime()-new Date(a.updated_at).getTime();
  });
  const count=filtered.length;
  const from=(page-1)*pageSize;
  const visible=filtered.slice(from,from+pageSize);
  const statuses=["applied","review_by_admin","additional_information_needed","approved","denied","withdrawn","archived"];
  const needs=["Tuition or fees","Housing or utilities","Food","Transportation","Books or supplies","Technology","Childcare","Health or wellness","Other"];
  const cycles=(cyclesResult.data??[]) as unknown as ProgramCycle[];

  return <main className="section white"><div className="shell">
    <Link href="/admin" className="card-link">← Command center</Link>
    <div className="section-head">
      <div><div className="eyebrow">Application review workspace</div><h2>Review, communicate, and decide in one place</h2><p className="muted">Filter by scholarship, open the student record, request corrections, assign reviewers, and apply audited decisions.</p></div>
      <div className="admin-workspace-actions">{visible[0]&&<Link className="button" href={`/admin/applications/${visible[0].id}`}>Review next application</Link>}<Link className="button outline" href="/admin/communications">Email delivery</Link><Link className="button outline" href="/admin/applicant-pool">Applicant pool</Link></div>
    </div>
    <div className="stats application-queue-stats">{queueStatuses.map((status,index)=><Link className={`stat ${selectedStatus===status?"active":""}`} href={{pathname:"/admin/applications",query:{status,per_page:String(pageSize),...(params.cycle?{cycle:params.cycle}:{})}}} key={status}><strong>{queueResults[index].count??0}</strong><span>{statusLabel(status)}</span></Link>)}</div>
    <section className="application-quick-views" aria-label="Application work queues"><div><div className="eyebrow">Start here</div><h3>Choose the group you want to work on</h3><p className="muted">These shortcuts organize the applications for you. They do not change any records.</p></div><div className="quick-view-grid">{quickViews.map(view=><Link key={view.key} className={`quick-view-card ${params.view===view.key?"active":""}`} href={{pathname:"/admin/applications",query:{view:view.key,per_page:String(pageSize)}}}><strong>{view.label}</strong><span>{view.description}</span></Link>)}</div></section>
    {params.bulk_updated&&<div className="notice"><strong>{params.bulk_updated} application(s) updated.</strong> {params.bulk_action==="additional_information_needed"?"Correction requests":"Student notices"} were queued once through the protected email system.{Number(params.bulk_failed)>0?` ${params.bulk_failed} were skipped because the selected transition was not allowed.`:""}</div>}
    {params.bulk_error&&<div className="notice error-text"><strong>Bulk action not completed:</strong> {params.bulk_error}</div>}

    <form className="application-filters">
      <label>Search<input name="q" defaultValue={params.q} placeholder="Name, email, school, ID, or answer"/></label>
      <label>Stage<select name="status" defaultValue={selectedStatus}><option value="">All stages</option>{statuses.map(status=><option value={status} key={status}>{statusLabel(status)}</option>)}</select></label>
      <label>Scholarship or cycle<select name="cycle" defaultValue={params.cycle??""}><option value="">All scholarships</option>{cycles.map(cycle=><option value={cycle.id} key={cycle.id}>{cycle.programs?.name??"Program"} — {cycle.name}</option>)}</select></label>
      <label>Need<select name="need" defaultValue={params.need??""}><option value="">All need types</option>{needs.map(need=><option key={need}>{need}</option>)}</select></label>
      <label>Minimum requested<input name="min_amount" type="number" min="0" step="0.01" defaultValue={selectedMin} placeholder="$0"/></label>
      <label>Maximum requested<input name="max_amount" type="number" min="0" defaultValue={params.max_amount} placeholder="No maximum"/></label>
      <label>Sort results<select name="sort" defaultValue={sort}><option value="updated_desc">Recently updated</option><option value="submitted_asc">Oldest submitted first</option><option value="amount_desc">Highest amount first</option><option value="amount_asc">Lowest amount first</option><option value="name_asc">Applicant name A–Z</option></select></label>
      <label className="check"><input name="urgent" type="checkbox" value="yes" defaultChecked={selectedUrgent==="yes"}/><span>Show urgency language</span></label>
      <label>Rows<select name="per_page" defaultValue={String(pageSize)}>{allowedPageSizes.map(size=><option key={size} value={size}>{size} per page</option>)}</select></label>
      <div className="filter-actions"><button className="button">Apply filters</button><Link className="button outline" href="/admin/applications">Clear</Link></div>
    </form>

    <form action={bulkTransitionApplications}>
      {canBulk&&<section className="card bulk-workspace"><div className="section-head"><div><div className="eyebrow">Bulk actions</div><h3>Update a selected group safely</h3></div><span className="status">Maximum 250</span></div><BulkSelectionControls count={visible.length}/></section>}
      {visible.length?<div className="table-wrap application-table"><table><thead><tr>{canBulk&&<th>Select</th>}<th>Applicant</th><th>Scholarship and summary</th><th>Need</th><th>Requested</th><th>Stage</th><th>Submitted</th><th>Action</th></tr></thead><tbody>{visible.map(item=>{
        const profile=item.profiles as unknown as {legal_name:string|null;primary_email:string|null;institution:string|null};
        const answers=(item.application_answers as unknown as Answer[])??[];
        const need=String(answer(answers,"need_category")??"Not provided");
        const amount=money(answer(answers,"amount_requested"));
        const narrative=String(answer(answers,"financial_need_description")??"").trim();
        const cycle=item.program_cycles as unknown as ProgramCycle|null;
        const urgent=urgentWords.test(`${need} ${narrative}`);
        return <tr key={item.id}>{canBulk&&<td><input aria-label={`Select ${profile?.legal_name??"application"}`} type="checkbox" name="application_ids" value={item.id}/></td>}<td><strong>{profile?.legal_name??"Applicant"}</strong><br/><small>{profile?.primary_email}<br/>{profile?.institution}<br/>{item.id}</small></td><td><strong>{cycle?.programs?.name??"Program not listed"}</strong><br/><small>{cycle?.name}<br/>{narrative?excerpt(narrative):"No financial-need summary provided."}</small></td><td>{need}{urgent&&<><br/><span className="status status-additional_information_needed">Urgency language</span></>}</td><td>{amount?`$${amount.toLocaleString()}`:"—"}</td><td><span className={`status status-${item.status}`}>{statusLabel(item.status)}</span></td><td>{item.submitted_at?new Date(item.submitted_at).toLocaleDateString():"—"}</td><td><div className="application-row-actions"><Link className="button outline" href={`/admin/applications/${item.id}`}>View and act</Link><Link className="card-link" href={`/admin/applications/${item.id}#email-student`}>Email student</Link></div></td></tr>;
      })}</tbody></table></div>:<div className="card empty-review-state"><h3>No applications match these filters.</h3><p className="muted">Clear one or more filters to return to the full workspace.</p><Link className="button outline" href="/admin/applications">Clear filters</Link></div>}
    </form>
    <p className="muted"><strong>{count.toLocaleString()} matching application(s).</strong> Showing {visible.length} on page {page} of {Math.max(1,Math.ceil(count/pageSize))}. Search and filters cover the complete matching pool, not only this page. “Urgency language” is a review aid based on the applicant’s own words; it is not an eligibility or award decision.</p>
    <div className="review-pagination">{page>1&&<Link className="button outline" href={{pathname:"/admin/applications",query:{...params,page:String(page-1)}}}>← Previous</Link>}{from+pageSize<count&&<Link className="button outline" href={{pathname:"/admin/applications",query:{...params,page:String(page+1)}}}>Next →</Link>}</div>
  </div></main>;
}
