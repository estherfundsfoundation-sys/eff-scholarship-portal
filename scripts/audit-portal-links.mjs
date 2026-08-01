const base=new URL(process.argv[2]??"https://portal.estherfundsfoundation.org");
const max=Number(process.argv[3]??250);
const seeds=["/","/programs","/scholarships","/resources","/account-help","/sign-in","/sign-up","/dashboard","/academy","/careers","/partners","/help-desk","/tech-desk","/admin","/admin/sign-in"];
const queue=seeds.map(path=>new URL(path,base));
const visited=new Set();
const results=[];
const failures=[];

function normalize(raw,current){
  const decoded=raw.replaceAll("&amp;","&").trim();
  if(!decoded||decoded.startsWith("#")||/^(mailto:|tel:|javascript:)/i.test(decoded))return null;
  let url;
  try{url=new URL(decoded,current)}catch{return null}
  if(url.origin!==base.origin)return null;
  url.hash="";
  if(url.pathname.startsWith("/api/")||url.pathname.startsWith("/auth/")||url.searchParams.has("token"))return null;
  return url;
}
function links(html,current){
  const found=[];
  for(const match of html.matchAll(/(?:href|action)=["']([^"'<>]+)["']/gi)){
    const url=normalize(match[1],current);
    if(url)found.push(url);
  }
  return found;
}

while(queue.length&&visited.size<max){
  const url=queue.shift();
  const key=url.toString();
  if(visited.has(key))continue;
  visited.add(key);
  try{
    const response=await fetch(url,{redirect:"manual",headers:{"user-agent":"EFF-Portal-Link-Audit/1.0"},signal:AbortSignal.timeout(15000)});
    const location=response.headers.get("location");
    results.push({url:key,status:response.status,location});
    if(response.status>=400){
      failures.push({url:key,status:response.status});
      continue;
    }
    if(location){
      const target=normalize(location,url);
      if(target&&!visited.has(target.toString()))queue.push(target);
    }
    const type=response.headers.get("content-type")??"";
    if(response.status>=200&&response.status<300&&type.includes("text/html")){
      const html=await response.text();
      for(const target of links(html,url))if(!visited.has(target.toString())&&queue.length+visited.size<max*2)queue.push(target);
    }
  }catch(error){
    failures.push({url:key,status:"FETCH_ERROR",detail:error instanceof Error?error.message:String(error)});
  }
}

const byStatus=results.reduce((acc,item)=>{acc[item.status]=(acc[item.status]??0)+1;return acc},{});
console.log(JSON.stringify({base:base.origin,checked:visited.size,byStatus,failures},null,2));
if(failures.length)process.exitCode=1;
