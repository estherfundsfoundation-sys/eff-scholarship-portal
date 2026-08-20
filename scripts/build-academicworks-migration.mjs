import {createHash} from "node:crypto";
import {writeFile} from "node:fs/promises";
import {JSDOM} from "jsdom";

const output=new URL("../supabase/migrations/20260819230000_official_university_scholarships.sql",import.meta.url);
const today=new Date().toISOString().slice(0,10);
const tenants=[
  {key:"academicworks_uark",host:"uark.academicworks.com",institution:"University of Arkansas",unitid:106397},
  {key:"academicworks_radford",host:"radford.academicworks.com",institution:"Radford University",unitid:233277},
  {key:"academicworks_dallascollege",host:"dallascollege.academicworks.com",institution:"Dallas College",unitid:224615},
  {key:"academicworks_ucla",host:"ucla.academicworks.com",institution:"University of California-Los Angeles",unitid:110662},
  {key:"academicworks_depaul",host:"depaul.academicworks.com",institution:"DePaul University",unitid:144740},
  {key:"academicworks_salisbury",host:"salisbury.academicworks.com",institution:"Salisbury University",unitid:163851},
  {key:"academicworks_pvamu",host:"pvamu.academicworks.com",institution:"Prairie View A & M University",unitid:227526},
  {key:"academicworks_lsus",host:"lsus.academicworks.com",institution:"Louisiana State University-Shreveport",unitid:159416},
  {key:"academicworks_alvincollege",host:"alvincollege.academicworks.com",institution:"Alvin Community College",unitid:222567},
  {key:"academicworks_austincc",host:"austincc.academicworks.com",institution:"Austin Community College District",unitid:222992},
  {key:"academicworks_csmd",host:"csmd.academicworks.com",institution:"College of Southern Maryland",unitid:162122},
  {key:"academicworks_plymouth",host:"plymouth.academicworks.com",institution:"Plymouth State University",unitid:183080},
  {key:"academicworks_wcsu",host:"wcsu.academicworks.com",institution:"Western Connecticut State University",unitid:130776},
  {key:"academicworks_esc",host:"esc.academicworks.com",institution:"SUNY Empire State University",unitid:196264},
  {key:"academicworks_astate",host:"astate.academicworks.com",institution:"Arkansas State University",unitid:106458},
  {key:"academicworks_western",host:"western.academicworks.com",institution:"Western Colorado University",unitid:128391},
  {key:"academicworks_eiu",host:"eiu.academicworks.com",institution:"Eastern Illinois University",unitid:144892},
  {key:"academicworks_msubillings",host:"msubillings.academicworks.com",institution:"Montana State University Billings",unitid:180179},
  {key:"academicworks_siu",host:"siu.academicworks.com",institution:"Southern Illinois University-Carbondale",unitid:149222},
  {key:"academicworks_uwf",host:"uwf.academicworks.com",institution:"The University of West Florida",unitid:138354},
  {key:"academicworks_buffalo",host:"buffalo.academicworks.com",institution:"University at Buffalo",unitid:196088},
  {key:"academicworks_fsu",host:"fsu.academicworks.com",institution:"Florida State University",unitid:134097},
  {key:"academicworks_sunyorange",host:"sunyorange.academicworks.com",institution:"Orange County Community College",unitid:194240},
  {key:"academicworks_ua",host:"ua.academicworks.com",institution:"The University of Alabama",unitid:100751},
  {key:"academicworks_gsu",host:"gsu.academicworks.com",institution:"Georgia State University",unitid:139940},
  {key:"academicworks_mhcc",host:"mhcc.academicworks.com",institution:"Mt Hood Community College",unitid:209250},
];

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const text=node=>node?.textContent?.replace(/\s+/g," ").trim()||"";
const isoDate=value=>{const match=value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);if(!match)return null;return `${match[3]}-${match[1].padStart(2,"0")}-${match[2].padStart(2,"0")}`;};
const slug=(title,url)=>`${title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,70)}-${createHash("sha1").update(url).digest("hex").slice(0,8)}`;

async function fetchHtml(url){
  for(let attempt=1;attempt<=4;attempt++){
    const response=await fetch(url,{headers:{Accept:"text/html", "User-Agent":"EstherFundsFoundation-ScholarshipVerifier/1.0 (+https://portal.estherfundsfoundation.org/scholarships)"}});
    if(response.ok)return response.text();
    if(attempt===4||![429,500,502,503,504].includes(response.status))throw new Error(`${url} returned ${response.status}`);
    await pause(500*attempt);
  }
}

async function crawl(tenant){
  const base=`https://${tenant.host}`;const records=[];
  const robots=await fetchHtml(`${base}/robots.txt`);if(/User-Agent:\s*\*[^]*?Disallow:\s*\/(?:\s|$)/i.test(robots))throw new Error(`${tenant.host} disallows crawling`);
  for(let page=1;page<=120;page++){
    const url=page===1?`${base}/opportunities`:`${base}/?page=${page}`;
    const dom=new JSDOM(await fetchHtml(url));const rows=[...dom.window.document.querySelectorAll('table[caption="Opportunity Table"] tbody tr')];
    if(!rows.length)break;
    for(const row of rows){
      const link=row.querySelector('a[href^="/opportunities/"]');if(!link)continue;
      const title=text(link),deadline=isoDate(text(row.querySelector("td:last-child")));if(!deadline||deadline<today)continue;
      const detailUrl=new URL(link.getAttribute("href"),base).toString();const amount=text(row.querySelector("td:first-child"));
      records.push({slug:slug(title,detailUrl),title,normalized_title:title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g," ").trim(),sponsor:tenant.institution,amount_text:amount&&!/^\$?0(?:\.00)?$/i.test(amount)?amount:null,deadline,canonical_url:detailUrl,original_url:detailUrl,institution_unitid:tenant.unitid,eligibility:{institutions:[tenant.institution]},source_record_key:`${tenant.host}:${link.getAttribute("href").split("/").pop()}`});
    }
    if(!dom.window.document.querySelector('a[href*="page="]')||rows.length<50)break;
    await pause(175);
  }
  return [...new Map(records.map(record=>[record.canonical_url,record])).values()];
}

const batches=[];for(const tenant of tenants){const records=await crawl(tenant);if(records.length)batches.push({tenant,records});console.log(`${tenant.host}: ${records.length}`);}
const rows=batches.flatMap(batch=>batch.records);if(rows.length<1000)throw new Error(`Safety stop: only ${rows.length} official current records were found`);
const safe=value=>String(value).replaceAll("'","''");const json=JSON.stringify(rows).replaceAll("$eff$","$ eff $");
const sourceSql=batches.map(({tenant})=>`('${safe(tenant.key)}','${safe(`${tenant.institution} Scholarship Portal`)}','https://${tenant.host}/opportunities','official_provider','Public scholarship facts from the institution official Blackbaud Award Management portal. Descriptions are not republished.','1.0.0',true)`).join(",\n");
const sql=`-- Generated ${today} from official public university scholarship portals.\n-- Only factual title, amount, deadline, institution, and official application URL are stored.\ninsert into public.external_sources(key,name,directory_url,permission_status,permission_notes,parser_version,active) values\n${sourceSql}\non conflict(key) do update set directory_url=excluded.directory_url,permission_status='official_provider',permission_notes=excluded.permission_notes,parser_version=excluded.parser_version,active=true;\n\nwith records as (select * from jsonb_to_recordset($eff$${json}$eff$::jsonb) as x(slug text,title text,normalized_title text,sponsor text,amount_text text,deadline date,canonical_url text,original_url text,institution_unitid bigint,eligibility jsonb,source_record_key text))\ninsert into public.external_scholarships(slug,title,normalized_title,sponsor,amount_text,deadline_kind,deadline,original_url,canonical_url,eligibility,institution_unitid,published_at,verification_status,verified_at,last_checked_at,source_license,archived_at,updated_at)\nselect slug,title,normalized_title,sponsor,amount_text,'date',deadline,original_url,canonical_url,eligibility,institution_unitid,now(),'verified_current',now(),now(),'official-provider-facts',null,now() from records\non conflict(canonical_url) do update set title=excluded.title,normalized_title=excluded.normalized_title,sponsor=excluded.sponsor,amount_text=excluded.amount_text,deadline_kind='date',deadline=excluded.deadline,eligibility=excluded.eligibility,institution_unitid=excluded.institution_unitid,published_at=now(),verification_status='verified_current',verified_at=now(),last_checked_at=now(),source_license='official-provider-facts',archived_at=null,updated_at=now();\n\nwith records as (select * from jsonb_to_recordset($eff$${json}$eff$::jsonb) as x(canonical_url text,source_record_key text)), scholarships as (select id,canonical_url,sponsor from public.external_scholarships where canonical_url in(select canonical_url from records)), sources as(select id,name from public.external_sources where key like 'academicworks_%')\ninsert into public.source_observations(source_id,scholarship_id,source_record_key,source_page_url,observed_data,first_seen_at,last_seen_at)\nselect sources.id,scholarships.id,records.source_record_key,scholarships.canonical_url,jsonb_build_object('fact_source','official university scholarship portal','verified_on','${today}'),now(),now() from records join scholarships using(canonical_url) join sources on sources.name=scholarships.sponsor||' Scholarship Portal'\non conflict(source_id,source_record_key) do update set scholarship_id=excluded.scholarship_id,source_page_url=excluded.source_page_url,observed_data=excluded.observed_data,last_seen_at=now();\n`;
await writeFile(output,sql,"utf8");console.log(JSON.stringify({records:rows.length,output:output.pathname}));
