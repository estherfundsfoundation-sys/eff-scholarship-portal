import fs from "node:fs";
import path from "node:path";

const ipedsRoot=path.resolve(process.cwd(),"..","ipeds");
const directoryCsv=path.join(ipedsRoot,"HD2023","HD2023.csv");
const outputPath=path.resolve(process.cwd(),"src","data","partner-outreach-audience.json");

function parseCsv(text){
  const rows=[];let row=[],field="",quoted=false;
  for(let index=0;index<text.length;index++){
    const character=text[index];
    if(quoted){
      if(character==='"'&&text[index+1]==='"'){field+='"';index++;}
      else if(character==='"')quoted=false;
      else field+=character;
    }else if(character==='"')quoted=true;
    else if(character===","){row.push(field);field="";}
    else if(character==="\n"){row.push(field.replace(/\r$/,""));rows.push(row);row=[];field="";}
    else field+=character;
  }
  if(field||row.length){row.push(field);rows.push(row);}
  return rows;
}

const csvRows=parseCsv(fs.readFileSync(directoryCsv,"utf8"));
const headers=csvRows.shift();
headers[0]=headers[0].replace(/^\uFEFF/,"");
const column=Object.fromEntries(headers.map((name,index)=>[name,index]));
const institutions=new Map(csvRows.map(row=>[
  Number(row[column.UNITID]),
  {
    unitid:Number(row[column.UNITID]),
    name:row[column.INSTNM],
    state:row[column.STABBR],
    hbcu:Number(row[column.HBCU])===1
  }
]));

const priority={student_advocacy:1,basic_needs:2,financial_aid:3,registrar:4,student_accounts:5};
const validEmail=/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const excludedEmail=/(^|[._-])(no-?reply|do-?not-?reply|test|testing)([._@-]|$)/i;
const tuple=/^\((\d+),'((?:''|[^'])*)','((?:''|[^'])*)','((?:''|[^'])*)',('(?:''|[^'])*'|null),/gm;
const chosen=new Map();

for(const filename of fs.readdirSync(ipedsRoot).filter(name=>name.endsWith(".sql")).sort()){
  const contents=fs.readFileSync(path.join(ipedsRoot,filename),"utf8");
  for(const section of contents.split(/insert into public\.college_contact_directory/i).slice(1)){
    const values=section.split(/on conflict/i)[0];
    for(const match of values.matchAll(tuple)){
      const unitid=Number(match[1]),departmentKey=match[2].replaceAll("''","'"),emailToken=match[5];
      if(!institutions.has(unitid)||!(departmentKey in priority)||emailToken==="null"||!values.slice(match.index,match.index+1800).includes("'verified'"))continue;
      const email=emailToken.slice(1,-1).replaceAll("''","'").trim().toLowerCase();
      if(!validEmail.test(email)||excludedEmail.test(email))continue;
      const candidate={
        ...institutions.get(unitid),
        email,
        department_key:departmentKey,
        source_file:filename,
        rank:priority[departmentKey]
      };
      const current=chosen.get(unitid);
      if(!current||candidate.rank<current.rank||(candidate.rank===current.rank&&candidate.source_file>current.source_file))chosen.set(unitid,candidate);
    }
  }
}

const seenEmails=new Set();
const audience=[...chosen.values()]
  .sort((left,right)=>Number(right.hbcu)-Number(left.hbcu)||left.state.localeCompare(right.state)||left.name.localeCompare(right.name))
  .filter(record=>{
    if(seenEmails.has(record.email))return false;
    seenEmails.add(record.email);
    return true;
  })
  .map(({rank,...record})=>record);
const summary={
  generated_at:new Date().toISOString(),
  source:"NCES IPEDS HD2023 and verified official-school contact research",
  total:audience.length,
  hbcu:audience.filter(item=>item.hbcu).length,
  pwi_and_other:audience.filter(item=>!item.hbcu).length,
  states:[...new Set(audience.map(item=>item.state))].length,
  audience
};

fs.mkdirSync(path.dirname(outputPath),{recursive:true});
fs.writeFileSync(outputPath,`${JSON.stringify(summary,null,2)}\n`,"utf8");
console.log(JSON.stringify({outputPath,total:summary.total,hbcu:summary.hbcu,pwi_and_other:summary.pwi_and_other,states:summary.states}));
