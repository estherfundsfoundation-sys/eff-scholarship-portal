import Link from "next/link";
import {createClient} from "@/lib/supabase/server";
import {saveSchool} from "../actions";

type School={id:string;name:string;city:string|null;state_code:string;institution_type:string;public_private:string|null;hbcu:boolean;application_url:string|null};
const states=["AL","AR","FL","GA","KY","LA","MS","NC","OK","SC","TN","TX","VA","WV"];

export default async function SouthernSchoolsPage({searchParams}:{searchParams:Promise<{state?:string;q?:string;error?:string}>}){
  const params=await searchParams;const state=states.includes(params.state??"")?params.state:"";const term=(params.q??"").trim().replace(/[,%()]/g," ").slice(0,80);
  const db=await createClient();let query=db.from("applyall_institutions").select("id,name,city,state_code,institution_type,public_private,hbcu,application_url").eq("active",true).eq("is_demonstration",false).order("name").limit(500);
  if(state)query=query.eq("state_code",state);if(term)query=query.or(`name.ilike.%${term}%,city.ilike.%${term}%`);
  const {data,error}=await query;const schools=(data??[]) as School[];
  return <main className="applyall"><section className="applyall-workspace"><div className="shell"><span className="applyall-kicker">Southern institution directory</span><h1>Find your starting point.</h1><p className="applyall-lead">Explore sourced colleges and universities across the Southern launch region. “Official application” opens the institution-listed application page. A listing does not mean ApplyAll automation is approved.</p>{params.error&&<p className="applyall-alert" role="alert">{params.error}</p>}
    <form className="applyall-directory-filters"><label>Search<input name="q" defaultValue={term} placeholder="School or city"/></label><label>State<select name="state" defaultValue={state}><option value="">All Southern states</option>{states.map((code)=><option key={code}>{code}</option>)}</select></label><button className="button">Search</button></form>
    {error?<div className="applyall-alert">The Southern directory will appear after the ApplyAll database migration is applied.</div>:<><p><strong>{schools.length}</strong> sourced institutions shown{schools.length===500?" (refine your search to see more)":""}.</p><div className="applyall-directory-grid">{schools.map((school)=><article key={school.id}><span>{school.state_code}{school.hbcu?" · HBCU":""}</span><h2>{school.name}</h2><p>{[school.city,school.institution_type,school.public_private].filter(Boolean).join(" · ")}</p><form action={saveSchool}><input type="hidden" name="institutionId" value={school.id}/><button className="button">Add to my list</button></form><div>{school.application_url?<a className="button outline" href={school.application_url} target="_blank" rel="noopener noreferrer">Official application</a>:<span className="muted">Official application link under verification</span>}</div><small>ApplyAll route: mapping required</small></article>)}</div></>}
    <div className="applyall-footer-actions"><Link className="button outline" href="/apply-everywhere">Back to Apply Everywhere</Link><Link className="button" href="/apply-everywhere/dashboard">My Apply Everywhere dashboard</Link></div>
  </div></section></main>;
}
