import {createHmac,timingSafeEqual} from "node:crypto";

const CASE_ID=/^[a-f0-9-]{36}$/i;
const THIRTY_DAYS=30*24*60*60*1000;

function secret(){
  const value=process.env.HOWARD_PACKET_SECRET||process.env.CRON_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!value)throw new Error("Howard packet signing secret is not configured.");
  return value;
}

function signature(payload:string){
  return createHmac("sha256",secret()).update(payload).digest("base64url");
}

export function createHowardPacketToken(caseId:string,expiresAt=Date.now()+THIRTY_DAYS){
  if(!CASE_ID.test(caseId))throw new Error("Invalid Howard case identifier.");
  const payload=`${caseId}.${Math.floor(expiresAt/1000)}`;
  return `${payload}.${signature(payload)}`;
}

export function verifyHowardPacketToken(token:string,now=Date.now()){
  const [caseId,expiresText,provided,...extra]=token.split(".");
  if(extra.length||!caseId||!CASE_ID.test(caseId)||!expiresText||!/^\d{10}$/.test(expiresText)||!provided)return null;
  const expiresAt=Number(expiresText)*1000;
  if(!Number.isFinite(expiresAt)||expiresAt<=now)return null;
  const payload=`${caseId}.${expiresText}`;
  const expected=Buffer.from(signature(payload));
  const received=Buffer.from(provided);
  if(expected.length!==received.length||!timingSafeEqual(expected,received))return null;
  return {caseId,expiresAt};
}

export function createHowardPacketUrl(caseId:string,origin="https://portal.estherfundsfoundation.org"){
  const url=new URL("/resources/howard-help/packet",origin);
  url.searchParams.set("token",createHowardPacketToken(caseId));
  return url.toString();
}
