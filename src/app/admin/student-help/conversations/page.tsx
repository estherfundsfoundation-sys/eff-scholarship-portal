import Link from "next/link";
import {LockKeyhole,MessageSquarePlus,ShieldAlert} from "lucide-react";
import {requireAdmin} from "@/lib/auth/staff";
import {createAdminClient} from "@/lib/supabase/admin";
import {issueSecureHelpDeskAccess} from "../help-desk-actions";

export default async function HelpDeskConversationsAdmin(){
  await requireAdmin();const admin=createAdminClient();
  const {data:cases}=await admin.from("student_help_cases").select("id,case_code,student_name,school_name,issue_type,urgency,school_deadline,status,verified_at,secure_access_issued_at,created_at,help_desk_conversations(id,status,risk_level,assigned_volunteer_id,last_message_at,conduct_flag)").not("verified_at","is",null).order("created_at",{ascending:false}).limit(500);
  const active=(cases??[]).filter(item=>{const c=Array.isArray(item.help_desk_conversations)?item.help_desk_conversations[0]:item.help_desk_conversations;return c&&!["closed"].includes(c.status)}).length;
  const escalated=(cases??[]).filter(item=>{const c=Array.isArray(item.help_desk_conversations)?item.help_desk_conversations[0]:item.help_desk_conversations;return c&&["escalated","safety_locked"].includes(c.status)}).length;
  return <main className="section white"><div className="shell"><Link href="/admin" className="card-link">← Command center</Link><div className="section-head"><div><div className="eyebrow">Protected executive workspace</div><h1>Conversations and transcripts</h1><p>Every verified case, secure access status, full transcript, assigned volunteer, safety lock, and closure record.</p></div><LockKeyhole/></div>
    <div className="stats admin-stats"><div className="stat"><strong>{cases?.length??0}</strong><span>verified cases</span></div><div className="stat"><strong>{active}</strong><span>open conversations</span></div><div className="stat"><strong>{escalated}</strong><span>escalated or safety locked</span></div><div className="stat"><strong>{cases?.filter(item=>!item.secure_access_issued_at).length??0}</strong><span>need secure access</span></div></div>
    <div className="howard-admin-list">{(cases??[]).map(item=>{const conversation=Array.isArray(item.help_desk_conversations)?item.help_desk_conversations[0]:item.help_desk_conversations;return <article className="card help-desk-conversation-row" key={item.id}><div><span className={`status ${conversation?.status||"not-issued"}`}>{conversation?.status?.replaceAll("_"," ")||"secure link not issued"}</span><h2>{item.student_name} · {item.school_name}</h2><p>{item.case_code} · {item.issue_type} · {item.urgency}</p><small>Deadline {item.school_deadline||"not provided"} · opened {new Date(item.created_at).toLocaleString()}</small></div><div className="hero-actions">{conversation?<Link className="button" href={`/admin/student-help/${item.case_code}`}>Open transcript</Link>:<form action={issueSecureHelpDeskAccess}><input type="hidden" name="caseId" value={item.id}/><button className="button"><MessageSquarePlus/> Issue secure access</button></form>}{conversation&&["escalated","safety_locked"].includes(conversation.status)&&<span className="help-desk-flag"><ShieldAlert/> Leadership review</span>}</div></article>})}</div>
  </div></main>;
}
