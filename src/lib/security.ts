export function safeInternalPath(value:unknown,fallback="/dashboard"){
  if(typeof value!=="string"||!value.startsWith("/")||value.startsWith("//")||value.includes("\\")||/[\u0000-\u001f]/.test(value))return fallback;
  try{const parsed=new URL(value,"https://portal.invalid");return parsed.origin==="https://portal.invalid"?`${parsed.pathname}${parsed.search}${parsed.hash}`:fallback}catch{return fallback}
}
export function escapeHtml(value:string){return value.replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]!))}
