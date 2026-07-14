import Link from "next/link";
import {ClipboardList,Database,FileDown,HeartHandshake,ShieldCheck,Star,Users} from "lucide-react";
import {requireStaff} from "@/lib/auth/staff";

export default async function Admin(){
  const {supabase,roles}=await requireStaff();
  const statuses=["applied","review_by_admin","additional_information_needed","approved"] as const;
  const counts=await Promise.all(statuses.map(status=>supabase.from("applications").select("id",{count:"exact",head:true}).eq("status",status)));
  const {count:exceptions}=await supabase.from("scholarship_exceptions").select("id",{count:"exact",head:true}).is("resolved_at",null);
  const cards=[
    {title:"Applications",text:"Search submissions, review answers and documents, request information, and record decisions.",href:"/admin/applications",icon:ClipboardList},
    {title:"Reviewer workspace",text:"Complete assigned rubrics, disclose conflicts, and submit locked reviews.",href:"/admin/reviews",icon:Star},
    {title:"Staff and reviewers",text:"Invite individual staff accounts and grant permission-scoped roles.",href:"/admin/team",icon:Users},
    {title:"Legacy applicant import",text:"Stage, reconcile, invite, and securely connect Name Your Need applicants.",href:"/admin/imports",icon:Database},
    {title:"Trusted sources",text:`Monitor scholarship sources and ${exceptions??0} unresolved exceptions.`,href:"/admin/sources",icon:ShieldCheck},
    {title:"Reports & exports",text:"Download permission-scoped operational reports with audit logging.",href:"/admin/reports",icon:FileDown},
  ];
  return <main className="section white"><div className="shell"><div className="eyebrow">Administration</div><h2>Command center</h2><p className="muted">Live, permission-scoped operations · Signed in as {roles.map(item=>item.role.replaceAll("_"," ")).join(", ")}</p><div className="stats admin-stats">{[["Applied",counts[0].count??0],["In review",counts[1].count??0],["Action needed",counts[2].count??0],["Approved",counts[3].count??0]].map(([label,count])=><div className="stat" key={label}><strong>{count}</strong><span>{label}</span></div>)}</div><div className="cards admin-cards">{cards.map(({title,text,href,icon:Icon})=><Link className="card admin-card" href={href} key={title}><Icon/><h3>{title}</h3><p>{text}</p><span className="card-link">Open workspace →</span></Link>)}</div><div className="notice" style={{marginTop:24}}><HeartHandshake size={18}/> Applicant-facing decisions remain separate from private reviewer notes and internal reasons.</div></div></main>;
}
