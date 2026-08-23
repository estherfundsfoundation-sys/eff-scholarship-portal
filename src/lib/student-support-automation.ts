import "server-only";

type AdminClient = ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>;

type SupportResource = {
  id:string;source_key:string;title:string;description:string;url:string;provider:string;
  issue_types:string[];states:string[];keywords:string[];verification_status:string;
};

const safeHosts = new Set([
  "studentaid.gov","www.hud.gov","hud.gov","www.211.org","211.org",
  "portal.estherfundsfoundation.org","estherfundsfoundation.org","www.estherfundsfoundation.org",
]);

function officialUrl(value:string){
  try { const url=new URL(value); return url.protocol==="https:"&&safeHosts.has(url.hostname.toLowerCase()); }
  catch { return false; }
}

async function probe(url:string){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),8000);
  try{
    const response=await fetch(url,{method:"HEAD",redirect:"follow",cache:"no-store",signal:controller.signal,headers:{"user-agent":"EFF-Resource-Verification/1.0"}});
    return {ok:response.ok,status:response.status};
  }catch{return {ok:false,status:null};}
  finally{clearTimeout(timer);}
}

export async function verifyDueSupportResources(admin:AdminClient){
  const {data}=await admin.from("student_support_resources")
    .select("id,source_key,url,official_source").eq("active",true)
    .lte("next_check_at",new Date().toISOString()).limit(40);
  let verified=0,quarantined=0;
  for(const item of data??[]){
    const result=officialUrl(item.url)&&item.official_source?await probe(item.url):{ok:false,status:null};
    const verificationStatus=result.ok?"verified":officialUrl(item.url)?"unavailable":"quarantined";
    await admin.from("student_support_resources").update({
      verification_status:verificationStatus,last_http_status:result.status,
      last_verified_at:new Date().toISOString(),next_check_at:new Date(Date.now()+(result.ok?7:1)*86400000).toISOString(),updated_at:new Date().toISOString(),
    }).eq("id",item.id);
    if(result.ok)verified++;else quarantined++;
  }
  return {checked:data?.length??0,verified,quarantined};
}

function scoreResource(caseRecord:{issue_type:string;school_state:string;situation_summary:string},resource:SupportResource){
  const text=caseRecord.situation_summary.toLowerCase();
  let score=resource.issue_types.includes(caseRecord.issue_type)?70:0;
  if(!resource.states.length||resource.states.includes(caseRecord.school_state))score+=10;
  const keywordMatches=resource.keywords.filter(keyword=>text.includes(keyword.toLowerCase())).length;
  score+=Math.min(keywordMatches*5,20);
  return Math.min(score,100);
}

export async function matchOpenHelpDeskCases(admin:AdminClient){
  const [{data:cases},{data:resources},{data:suppressions}]=await Promise.all([
    admin.from("student_help_cases").select("id,case_code,student_name,preferred_name,email,school_name,school_state,issue_type,situation_summary")
      .not("verified_at","is",null).in("status",["new","reviewing","waiting_on_student","referred_to_school","follow_up_due"]).limit(120),
    admin.from("student_support_resources").select("id,source_key,title,description,url,provider,issue_types,states,keywords,verification_status")
      .eq("active",true).eq("verification_status","verified"),
    admin.from("email_suppressions").select("email"),
  ]);
  const suppressedEmails=new Set((suppressions??[]).map(item=>String(item.email).trim().toLowerCase()));
  let matched=0,queued=0;
  for(const record of cases??[]){
    if(suppressedEmails.has(String(record.email).trim().toLowerCase()))continue;
    const ranked=((resources??[]) as SupportResource[]).map(resource=>({resource,score:scoreResource(record,resource)}))
      .filter(item=>item.score>=70).sort((a,b)=>b.score-a.score).slice(0,3);
    if(!ranked.length)continue;
    const rows=ranked.map(({resource,score})=>({case_id:record.id,support_resource_id:resource.id,title:resource.title,
      description:resource.description,url:resource.url,match_score:score,match_reason:`Matched to ${record.issue_type}${resource.states.length?` in ${record.school_state}`:" nationwide"}.`}));
    const {data:inserted}=await admin.from("student_help_case_resources").upsert(rows,{onConflict:"case_id,support_resource_id",ignoreDuplicates:true}).select("id");
    if(!inserted?.length)continue;
    matched+=inserted.length;
    const links=ranked.map(({resource})=>({title:resource.title,description:resource.description,url:resource.url,provider:resource.provider}));
    const idempotencyKey=`help-resource-match:${record.id}:${new Date().toISOString().slice(0,10)}`;
    const {data:message}=await admin.from("messages").upsert({recipient:record.email,idempotency_key:idempotencyKey,status:"queued",template_key:"help_desk_resource_match",
      payload_private:{name:record.preferred_name||record.student_name,case_code:record.case_code,school_name:record.school_name,support_resources:links,case_path:"/help-desk/access"}},
      {onConflict:"idempotency_key",ignoreDuplicates:true}).select("id").maybeSingle();
    if(message){queued++;await admin.from("student_help_case_resources").update({notification_status:"queued"}).in("id",inserted.map(row=>row.id));}
    await admin.from("student_help_case_events").insert({case_id:record.id,event_type:"automatic_resource_match",summary:`EFF matched ${inserted.length} verified resource${inserted.length===1?"":"s"} to this case.`});
  }
  return {cases:cases?.length??0,matched,queued};
}
