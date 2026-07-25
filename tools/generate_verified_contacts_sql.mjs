import fs from "node:fs";
import path from "node:path";

const [jsonArg,outputArg]=process.argv.slice(2);if(!jsonArg||!outputArg)throw new Error("Usage: node tools/generate_verified_contacts_sql.mjs <discovery.json> <output.sql>");
const report=JSON.parse(fs.readFileSync(path.resolve(jsonArg),"utf8"));const q=value=>value===null||value===undefined?"null":`'${String(value).replaceAll("'","''")}'`;
const rejectTitle=/\b(archives?|attachment|job|professor|prepares|participates|names|donates|continues|celebrates|announces|workshop|conference|grant|minor|degree program)\b/i;
const values=[];
for(const school of report.schools??[])for(const contact of school.contacts??[]){
  const title=String(contact.title??"").replace(/&[a-z#0-9]+;/gi," ");
  if(rejectTitle.test(title)||contact.verification_status!=="verified")continue;
  values.push(`(${school.unitid},${q(contact.department_key)},${q(contact.department_name)},${q(contact.contact_url)},${q(contact.email)},${q(contact.phone)},${q(contact.contact_url)},'official_school_page','verified',${q(contact.verified_at)},${q(contact.last_checked_at)},${q(contact.next_review_at)},${q(`Official page title: ${title}`)},now())`);
}
const sql=values.length?`insert into public.college_contact_directory(unitid,department_key,department_name,contact_url,email,phone,source_url,source_kind,verification_status,verified_at,last_checked_at,next_review_at,notes,updated_at) values
${values.join(",\n")}
on conflict(unitid,department_key) do update set department_name=excluded.department_name,contact_url=excluded.contact_url,email=excluded.email,phone=excluded.phone,source_url=excluded.source_url,source_kind=excluded.source_kind,verification_status=excluded.verification_status,verified_at=excluded.verified_at,last_checked_at=excluded.last_checked_at,next_review_at=excluded.next_review_at,notes=excluded.notes,updated_at=excluded.updated_at;`:"select 0;";
fs.writeFileSync(path.resolve(outputArg),sql,"utf8");console.log(`Prepared ${values.length} strictly verified official-school contacts.`);
