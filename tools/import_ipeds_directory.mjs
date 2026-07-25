import fs from "node:fs";
import path from "node:path";
import {createClient} from "@supabase/supabase-js";

function loadEnv(file){
  if(!file||!fs.existsSync(file))return;
  for(const line of fs.readFileSync(file,"utf8").split(/\r?\n/)){
    if(!line||line.trimStart().startsWith("#"))continue;
    const at=line.indexOf("=");if(at<1)continue;
    const key=line.slice(0,at).trim();let value=line.slice(at+1).trim();
    if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
    if(!process.env[key])process.env[key]=value;
  }
}
loadEnv(process.env.ENV_FILE);
const csvPath=process.env.IPEDS_CSV;
if(!csvPath)throw new Error("IPEDS_CSV is required.");
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error("Supabase environment variables are required.");

function parseCsv(text){
  const rows=[];let row=[];let field="";let quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){
      if(c==='"'&&text[i+1]==='"'){field+='"';i++;}
      else if(c==='"')quoted=false;
      else field+=c;
    }else if(c==='"')quoted=true;
    else if(c===","){row.push(field);field="";}
    else if(c==="\n"){row.push(field.replace(/\r$/,""));rows.push(row);row=[];field="";}
    else field+=c;
  }
  if(field||row.length){row.push(field);rows.push(row);}
  return rows;
}
const rows=parseCsv(fs.readFileSync(path.resolve(csvPath),"utf8"));
const headers=rows.shift().map(h=>h.replace(/^\uFEFF/,""));const index=Object.fromEntries(headers.map((h,i)=>[h,i]));
const get=(row,key)=>String(row[index[key]]??"").trim();
const num=(row,key)=>{const value=Number(get(row,key));return Number.isFinite(value)&&value>=0?value:null;};
const link=value=>{const v=String(value??"").trim();if(!v||v==="-"||v==="-2")return null;return /^https?:\/\//i.test(v)?v:`https://${v}`;};
const sourceUrl="https://nces.ed.gov/ipeds/datacenter/DataFiles.aspx?rtid=7&surveyNumber=-1&year=2023";
const institutions=[];const contacts=[];
for(const row of rows){
  if(get(row,"CYACTIVE")!=="1"||get(row,"POSTSEC")!=="1")continue;
  const unitid=Number(get(row,"UNITID"));if(!unitid)continue;
  const website=link(get(row,"WEBADDR"));const admissions=link(get(row,"ADMINURL"));const financialAid=link(get(row,"FAIDURL"));
  const veterans=link(get(row,"VETURL"));const accessibility=link(get(row,"DISAURL"));
  institutions.push({unitid,name:get(row,"INSTNM"),aliases:get(row,"IALIAS")||null,city:get(row,"CITY"),state:get(row,"STABBR"),zip:get(row,"ZIP")||null,website,admissions_url:admissions,financial_aid_url:financialAid,application_url:link(get(row,"APPLURL")),veterans_url:veterans,accessibility_url:accessibility,sector_code:num(row,"SECTOR"),level_code:num(row,"ICLEVEL"),control_code:num(row,"CONTROL"),hbcu:get(row,"HBCU")==="1",tribal:get(row,"TRIBAL")==="1",institution_size_code:num(row,"INSTSIZE"),active:true,latitude:num(row,"LATITUDE"),longitude:num(row,"LONGITUD"),source_year:2023,source_url:sourceUrl,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()});
  for(const [department_key,department_name,contact_url] of [["admissions","Admissions",admissions],["financial_aid","Financial Aid",financialAid],["veterans","Veterans Services",veterans],["accessibility","Accessibility or Disability Services",accessibility]]){
    if(contact_url)contacts.push({unitid,department_key,department_name,contact_url,source_url:sourceUrl,source_kind:"IPEDS",verification_status:"source_listed",last_checked_at:new Date().toISOString(),next_review_at:new Date(Date.now()+180*86400000).toISOString(),updated_at:new Date().toISOString()});
  }
}
const supabase=createClient(url,key,{auth:{persistSession:false}});
for(let i=0;i<institutions.length;i+=500){
  const {error}=await supabase.from("college_directory").upsert(institutions.slice(i,i+500),{onConflict:"unitid"});if(error)throw error;
  process.stdout.write(`Institutions ${Math.min(i+500,institutions.length)}/${institutions.length}\r`);
}
process.stdout.write("\n");
for(let i=0;i<contacts.length;i+=500){
  const {error}=await supabase.from("college_contact_directory").upsert(contacts.slice(i,i+500),{onConflict:"unitid,department_key"});if(error)throw error;
  process.stdout.write(`Contacts ${Math.min(i+500,contacts.length)}/${contacts.length}\r`);
}
console.log(`\nImported ${institutions.length} active institutions and ${contacts.length} official department links.`);
