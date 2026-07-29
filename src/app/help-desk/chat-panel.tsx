"use client";

import {useCallback, useEffect, useState} from "react";
import {AlertTriangle, ExternalLink, Send, ShieldCheck} from "lucide-react";

type Message = {
  id: string;
  sender_type: "student"|"volunteer"|"admin"|"system";
  body: string;
  safety_flag: boolean;
  conduct_flag: boolean;
  created_at: string;
};
type Suggestion = {key:string;title:string;href:string;summary:string;suggestedReply:string};

export function HelpDeskChatPanel({
  endpoint,
  role,
  initialStatus,
}:{
  endpoint:string;
  role:"student"|"volunteer";
  initialStatus:string;
}) {
  const [messages,setMessages]=useState<Message[]>([]);
  const [suggestions,setSuggestions]=useState<Suggestion[]>([]);
  const [status,setStatus]=useState(initialStatus);
  const [body,setBody]=useState("");
  const [loading,setLoading]=useState(true);
  const [sending,setSending]=useState(false);
  const [error,setError]=useState("");

  const refresh=useCallback(async()=>{
    try{
      const response=await fetch(endpoint,{cache:"no-store"});
      if(!response.ok)throw new Error(response.status===403?"This secure conversation is unavailable.":"Messages could not be loaded.");
      const data=await response.json();
      setMessages(data.messages??[]);
      setSuggestions(data.suggestions??[]);
      setStatus(data.status??initialStatus);
      setError("");
    }catch(err){setError(err instanceof Error?err.message:"Messages could not be loaded.");}
    finally{setLoading(false);}
  },[endpoint,initialStatus]);

  useEffect(()=>{void refresh();const timer=setInterval(()=>void refresh(),5000);return()=>clearInterval(timer);},[refresh]);

  async function sendMessage(event:React.FormEvent){
    event.preventDefault();
    if(!body.trim()||sending)return;
    setSending(true);setError("");
    try{
      const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({body})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"Your message could not be sent.");
      setBody("");await refresh();
    }catch(err){setError(err instanceof Error?err.message:"Your message could not be sent.");}
    finally{setSending(false);}
  }

  const locked=["safety_locked","closed"].includes(status);
  return <div className="help-desk-chat">
    <div className="help-desk-chat-status"><span className={`status ${status}`}>{status.replaceAll("_"," ")}</span><small>Secure messages refresh automatically.</small></div>
    <div className="help-desk-transcript" aria-live="polite">
      {loading?<p className="muted">Loading secure conversation…</p>:messages.length?messages.map(message=><article className={`help-desk-message ${message.sender_type}`} key={message.id}><div><strong>{message.sender_type==="student"?"Student":message.sender_type==="volunteer"?"EFF volunteer":message.sender_type==="admin"?"EFF National Office":"EFF safety and resource system"}</strong><time>{new Date(message.created_at).toLocaleString()}</time></div><p>{message.body}</p>{(message.safety_flag||message.conduct_flag)&&<span className="help-desk-flag"><AlertTriangle/> Protected escalation recorded</span>}</article>):<p className="muted">No messages yet.</p>}
    </div>
    {role==="volunteer"&&suggestions.length>0&&<aside className="help-desk-suggestions"><div className="eyebrow">Suggested resources and editable replies</div><p>Read the full case. Choose only what applies, then personalize it.</p>{suggestions.map(item=><details key={item.key}><summary>{item.title}</summary><p>{item.summary}</p><a href={item.href} target="_blank" rel="noreferrer">Open resource <ExternalLink size={14}/></a><button type="button" className="button outline" onClick={()=>setBody(item.suggestedReply)}>Use as a starting point</button></details>)}</aside>}
    {error&&<div className="notice error-text" role="alert"><AlertTriangle/>{error}</div>}
    {!locked?<form onSubmit={sendMessage} className="help-desk-composer"><label><span>{role==="student"?"Write a secure message":"Write a warm, individualized response"}</span><textarea value={body} onChange={event=>setBody(event.target.value)} minLength={2} maxLength={6000} required placeholder={role==="student"?"Tell us what changed, the nearest deadline, and what you need help understanding. Do not send passwords, SSNs, tax records, bank details, or unredacted IDs.":"Acknowledge the need, answer what you can verify, give the next step, and identify anything that must be escalated."}/></label><button className="button" disabled={sending}>{sending?"Sending…":<><Send size={17}/> Send secure message</>}</button></form>:<div className="notice"><ShieldCheck/><strong>{status==="safety_locked"?"This conversation is in a safety hold. EFF leadership has been alerted.":"This case is closed. EFF leadership may reopen it if further review is needed."}</strong></div>}
  </div>;
}
