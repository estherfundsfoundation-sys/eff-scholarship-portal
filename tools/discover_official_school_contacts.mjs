import fs from "node:fs";
import path from "node:path";

const [csvArg,outputArg,offsetArg="0",limitArg="15",cohortArg="hbcu"]=process.argv.slice(2);
if(!csvArg||!outputArg)throw new Error("Usage: node tools/discover_official_school_contacts.mjs <HD.csv> <output.json> [offset] [limit] [hbcu|large-non-hbcu]");
const offset=Math.max(0,Number(offsetArg)||0),limit=Math.min(50,Math.max(1,Number(limitArg)||15));
const cohort=cohortArg==="large-non-hbcu"?"large-non-hbcu":"hbcu";
const routes=[
  {key:"student_accounts",name:"Bursar or Student Accounts",terms:["bursar","student-accounts","studentaccounts","student-financial-services","billing-and-payments","cashier"],phrases:["bursar","student accounts","student financial services"]},
  {key:"registrar",name:"Registrar",terms:["registrar","registration-and-records","records-registration"],phrases:["registrar","records and registration","records & registration"]},
  {key:"basic_needs",name:"Basic Needs or Student Support",terms:["basic-needs","basicneeds","food-pantry","student-support-services","emergency-assistance"],phrases:["basic needs","food pantry","student support services","emergency assistance"]},
  {key:"housing",name:"Housing or Residence Life",terms:["residence-life","residential-life","university-housing","campus-housing","housing"],phrases:["housing","residence life","residential life"]},
  {key:"title_ix",name:"Title IX or Equal Opportunity",terms:["title-ix","titleix","equal-opportunity","equity-compliance"],phrases:["title ix","equal opportunity","equity compliance"]},
  {key:"international",name:"International Student Services",terms:["international-student","international-programs","global-education","international-education"],phrases:["international student","international programs","international education","global education"]},
  {key:"student_advocacy",name:"Dean of Students or Student Advocacy",terms:["dean-of-students","student-advocacy","student-affairs","student-success"],phrases:["dean of students","student advocacy","student affairs","student success center"]},
  {key:"technology",name:"Student Technology Support",terms:["information-technology","technology-services","help-desk","service-desk","it-support"],phrases:["information technology","technology services","help desk","service desk","it support"]}
];
function parseCsv(text){const rows=[];let row=[],field="",quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}else if(c==='"')quoted=true;else if(c===","){row.push(field);field="";}else if(c==="\n"){row.push(field.replace(/\r$/,""));rows.push(row);row=[];field="";}else field+=c;}if(field||row.length){row.push(field);rows.push(row);}return rows;}
const rows=parseCsv(fs.readFileSync(path.resolve(csvArg),"utf8")),headers=rows.shift().map(x=>x.replace(/^\uFEFF/,"")),ix=Object.fromEntries(headers.map((h,i)=>[h,i]));
const get=(row,key)=>String(row[ix[key]]??"").trim();const normalizeUrl=value=>{let v=String(value??"").trim();if(!v||v==="-2")return null;if(!/^https?:\/\//i.test(v))v=`https://${v}`;try{const u=new URL(v);u.hash="";return u.toString();}catch{return null;}};
const inCohort=row=>cohort==="hbcu"
  ? get(row,"HBCU")==="1"
  : get(row,"HBCU")!=="1"&&get(row,"INSTSIZE")==="5";
const schools=rows.filter(row=>get(row,"CYACTIVE")==="1"&&get(row,"POSTSEC")==="1"&&inCohort(row)).map(row=>({unitid:Number(get(row,"UNITID")),name:get(row,"INSTNM"),state:get(row,"STABBR"),website:normalizeUrl(get(row,"WEBADDR"))})).filter(x=>x.website).sort((a,b)=>a.name.localeCompare(b.name)).slice(offset,offset+limit);
const headersFetch={"User-Agent":"EstherFundsFoundation-ResourceVerifier/1.0 (+https://portal.estherfundsfoundation.org/resources/student-help)","Accept":"text/html,application/xml,text/xml;q=0.9,*/*;q=0.8"};
async function fetchText(url,timeout=12000){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);try{const response=await fetch(url,{headers:headersFetch,redirect:"follow",signal:controller.signal});if(!response.ok)return null;return {url:response.url,type:response.headers.get("content-type")??"",text:await response.text()};}catch{return null;}finally{clearTimeout(timer);}}
const locs=xml=>[...xml.matchAll(/<loc[^>]*>([\s\S]*?)<\/loc>/gi)].map(m=>m[1].replaceAll("&amp;","&").trim()).filter(Boolean);
const hrefs=html=>[...html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)].map(m=>m[1].trim()).filter(Boolean);
const sameSite=(candidate,home)=>{try{const a=new URL(candidate),b=new URL(home);const ah=a.hostname.replace(/^www\./,""),bh=b.hostname.replace(/^www\./,"");return ah===bh||ah.endsWith(`.${bh}`)||bh.endsWith(`.${ah}`);}catch{return false;}};
const canonical=(value,base)=>{try{const u=new URL(value,base);u.hash="";u.search="";return u.toString();}catch{return null;}};
const score=(url,route)=>{const lower=url.toLowerCase();if(/\/(news|events?|jobs?|tag|category|attachment|press-release|articles?|stories)\//i.test(lower)||/\/20\d{2}\/\d{1,2}\//.test(lower)||/\.(pdf|docx?|xlsx?)$/i.test(lower))return -100;let points=0;for(const term of route.terms)if(lower.includes(term))points+=term.length+20;return points;};
function extractContact(page,officialHost,route){
  const title=(page.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]??"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,240);
  const siteDomain=officialHost.replace(/^www\./,"").split(".").slice(-2).join(".");
  const emails=[...new Set([...page.text.matchAll(/mailto:([^"'? >]+)/gi)].map(m=>decodeURIComponent(m[1]).toLowerCase()).filter(x=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)&&x.split("@")[1].endsWith(siteDomain)&&!["webmaster","info","admissions"].includes(x.split("@")[0])))].slice(0,5);
  const phone=page.text.replace(/<[^>]+>/g," ").match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/)?.[0]??null;
  const titlePlain=title.replace(/&[a-z#0-9]+;/gi," ").replace(/\s+/g," ").toLowerCase();
  const editorialTitle=/\b(archives?|attachment|job|professor|prepares|participates|names|donates|continues|celebrates|announces|workshop|conference|grant|minor|degree program|retires?|helps|offered|wins|award|applications? open|concentration|bachelor|major|international education week|career programs|expected housing status|what information technology is)\b/i.test(titlePlain)
    ||/\b(today|magazine|newsroom)\b/i.test(titlePlain);
  const strongTitle=!editorialTitle&&route.phrases.some(phrase=>titlePlain.includes(phrase));
  return {title,emails,phone,strongTitle};
}
async function discover(school){
  const home=await fetchText(school.website);if(!home)return {...school,status:"unreachable",contacts:[]};
  const base=home.url,root=new URL(base).origin;const candidates=new Set([base]);const sitemapSeeds=[`${root}/sitemap.xml`,`${root}/sitemap_index.xml`,`${root}/wp-sitemap.xml`];
  for(const seed of sitemapSeeds){const map=await fetchText(seed,9000);if(!map)continue;const first=locs(map.text).slice(0,200);for(const item of first){if(/sitemap.*\.xml($|\?)/i.test(item)){const child=await fetchText(item,9000);if(child)for(const u of locs(child.text).slice(0,2500))candidates.add(u);}else candidates.add(item);}}
  for(const href of hrefs(home.text)){const u=canonical(href,base);if(u&&sameSite(u,base))candidates.add(u);}
  const contacts=[];
  for(const route of routes){
    const ranked=[...candidates].filter(u=>sameSite(u,base)).map(u=>({u,score:score(u,route)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.u.length-b.u.length).slice(0,3);
    let found=null;
    for(const candidate of ranked){const page=await fetchText(candidate.u);if(!page||!sameSite(page.url,base)||!/html/i.test(page.type))continue;const details=extractContact(page,new URL(base).hostname,route);if(!details.strongTitle)continue;found={department_key:route.key,department_name:route.name,contact_url:page.url,email:details.emails[0]??null,additional_emails:details.emails.slice(1),phone:details.phone,title:details.title,source_kind:"official_school_page",verification_status:"verified",verified_at:new Date().toISOString(),last_checked_at:new Date().toISOString(),next_review_at:new Date(Date.now()+180*86400000).toISOString()};break;}
    if(found)contacts.push(found);
  }
  return {...school,status:"checked",official_home:base,checked_at:new Date().toISOString(),contacts};
}
const results=[];for(let i=0;i<schools.length;i++){const school=schools[i];process.stdout.write(`[${i+1}/${schools.length}] ${school.name}\n`);results.push(await discover(school));}
fs.writeFileSync(path.resolve(outputArg),JSON.stringify({source:"NCES IPEDS HD2023 plus official institution websites",cohort,offset,limit,generated_at:new Date().toISOString(),schools:results},null,2),"utf8");
console.log(`Verified ${results.reduce((n,x)=>n+x.contacts.length,0)} department pages across ${results.length} ${cohort==="hbcu"?"HBCUs":"large non-HBCU institutions"}.`);
