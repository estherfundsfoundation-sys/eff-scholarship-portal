import fs from "node:fs";
import path from "node:path";

const [csvArg,outputArg]=process.argv.slice(2);
if(!csvArg||!outputArg)throw new Error("Usage: node tools/generate_ipeds_sql.mjs <HD.csv> <output.sql>");
function parseCsv(text){
  const rows=[];let row=[];let field="";let quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}else if(c==='"')quoted=true;else if(c===","){row.push(field);field="";}else if(c==="\n"){row.push(field.replace(/\r$/,""));rows.push(row);row=[];field="";}else field+=c;}
  if(field||row.length){row.push(field);rows.push(row);}return rows;
}
const rows=parseCsv(fs.readFileSync(path.resolve(csvArg),"utf8"));const headers=rows.shift().map(h=>h.replace(/^\uFEFF/,""));const ix=Object.fromEntries(headers.map((h,i)=>[h,i]));
const get=(row,key)=>String(row[ix[key]]??"").trim();const number=(row,key)=>{const value=Number(get(row,key));return Number.isFinite(value)&&value>=0?value:null;};
const link=value=>{const v=String(value??"").trim();if(!v||v==="-"||v==="-2")return null;return /^https?:\/\//i.test(v)?v:`https://${v}`;};
const q=value=>value===null||value===undefined?"null":`'${String(value).replaceAll("'","''")}'`;
const sourceUrl="https://nces.ed.gov/ipeds/datacenter/DataFiles.aspx?rtid=7&surveyNumber=-1&year=2023";const institutions=[];const contacts=[];
if(!rows.length||ix.CYACTIVE===undefined||ix.POSTSEC===undefined)throw new Error("The IPEDS CSV headers or rows could not be parsed.");
console.log(`Read ${rows.length} IPEDS rows; first active flags: ${get(rows[0],"CYACTIVE")}/${get(rows[0],"POSTSEC")}.`);
for(const row of rows){
  if(get(row,"CYACTIVE")!=="1"||get(row,"POSTSEC")!=="1")continue;const unitid=Number(get(row,"UNITID"));if(!unitid)continue;
  const website=link(get(row,"WEBADDR")),admissions=link(get(row,"ADMINURL")),aid=link(get(row,"FAIDURL")),veterans=link(get(row,"VETURL")),accessibility=link(get(row,"DISAURL"));
  institutions.push(`(${unitid},${q(get(row,"INSTNM"))},${q(get(row,"IALIAS")||null)},${q(get(row,"CITY"))},${q(get(row,"STABBR"))},${q(get(row,"ZIP")||null)},${q(website)},${q(admissions)},${q(aid)},${q(link(get(row,"APPLURL")))},${q(veterans)},${q(accessibility)},${number(row,"SECTOR")??"null"},${number(row,"ICLEVEL")??"null"},${number(row,"CONTROL")??"null"},${get(row,"HBCU")==="1"},${get(row,"TRIBAL")==="1"},${number(row,"INSTSIZE")??"null"},true,${number(row,"LATITUDE")??"null"},${number(row,"LONGITUD")??"null"},2023,${q(sourceUrl)},now(),now())`);
  for(const [key,name,url] of [["admissions","Admissions",admissions],["financial_aid","Financial Aid",aid],["veterans","Veterans Services",veterans],["accessibility","Accessibility or Disability Services",accessibility]])if(url)contacts.push(`(${unitid},${q(key)},${q(name)},${q(url)},${q(sourceUrl)},'IPEDS','source_listed',now(),now()+interval '180 days',now())`);
}
const chunks=(values,size)=>Array.from({length:Math.ceil(values.length/size)},(_,i)=>values.slice(i*size,(i+1)*size));
const sql=["begin;"];
for(const batch of chunks(institutions,250))sql.push(`insert into public.college_directory(unitid,name,aliases,city,state,zip,website,admissions_url,financial_aid_url,application_url,veterans_url,accessibility_url,sector_code,level_code,control_code,hbcu,tribal,institution_size_code,active,latitude,longitude,source_year,source_url,reviewed_at,updated_at) values\n${batch.join(",\n")}\non conflict(unitid) do update set name=excluded.name,aliases=excluded.aliases,city=excluded.city,state=excluded.state,zip=excluded.zip,website=excluded.website,admissions_url=excluded.admissions_url,financial_aid_url=excluded.financial_aid_url,application_url=excluded.application_url,veterans_url=excluded.veterans_url,accessibility_url=excluded.accessibility_url,sector_code=excluded.sector_code,level_code=excluded.level_code,control_code=excluded.control_code,hbcu=excluded.hbcu,tribal=excluded.tribal,institution_size_code=excluded.institution_size_code,active=excluded.active,latitude=excluded.latitude,longitude=excluded.longitude,source_year=excluded.source_year,source_url=excluded.source_url,reviewed_at=excluded.reviewed_at,updated_at=excluded.updated_at;`);
for(const batch of chunks(contacts,250))sql.push(`insert into public.college_contact_directory(unitid,department_key,department_name,contact_url,source_url,source_kind,verification_status,last_checked_at,next_review_at,updated_at) values\n${batch.join(",\n")}\non conflict(unitid,department_key) do update set department_name=excluded.department_name,contact_url=excluded.contact_url,source_url=excluded.source_url,source_kind=excluded.source_kind,verification_status=excluded.verification_status,last_checked_at=excluded.last_checked_at,next_review_at=excluded.next_review_at,updated_at=excluded.updated_at;`);
sql.push("commit;");fs.writeFileSync(path.resolve(outputArg),sql.join("\n\n"),"utf8");console.log(`Prepared ${institutions.length} institutions and ${contacts.length} official department links.`);
