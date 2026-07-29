import Link from "next/link";
import {Award, Ban, CheckCircle2, Clock3, Users} from "lucide-react";
import {requireAdmin} from "@/lib/auth/staff";
import {createAdminClient} from "@/lib/supabase/admin";
import {restoreHelpDeskVolunteer,revokeHelpDeskVolunteer} from "../help-desk-actions";

export default async function HelpDeskVolunteersAdmin(){
  await requireAdmin();const admin=createAdminClient();
  const [{data:volunteers},{data:logs},{data:activeShifts}]=await Promise.all([
    admin.from("help_desk_volunteer_profiles").select("*").order("created_at",{ascending:false}),
    admin.from("help_desk_service_logs").select("volunteer_id,minutes_credited,volunteer_message_count,started_at,ended_at"),
    admin.from("help_desk_shifts").select("volunteer_id,ends_at").eq("status","active").gt("ends_at",new Date().toISOString()),
  ]);
  const totals=new Map<string,{minutes:number,messages:number,sessions:number}>();
  for(const log of logs??[]){const current=totals.get(log.volunteer_id)??{minutes:0,messages:0,sessions:0};current.minutes+=log.minutes_credited??0;current.messages+=log.volunteer_message_count??0;current.sessions+=log.ended_at?1:0;totals.set(log.volunteer_id,current);}
  const active=new Set((activeShifts??[]).map(item=>item.volunteer_id));
  return <main className="section white"><div className="shell"><Link href="/admin" className="card-link">← Command center</Link><div className="section-head"><div><div className="eyebrow">National Help Desk governance</div><h1>Volunteers and service</h1><p>Training, access status, live availability, auditable service activity, and revocation controls.</p></div><Users/></div>
    <div className="stats admin-stats"><div className="stat"><strong>{volunteers?.filter(v=>v.status==="certified").length??0}</strong><span>certified</span></div><div className="stat"><strong>{active.size}</strong><span>available now</span></div><div className="stat"><strong>{volunteers?.filter(v=>v.status==="training").length??0}</strong><span>in training</span></div><div className="stat"><strong>{volunteers?.filter(v=>v.status==="revoked").length??0}</strong><span>revoked</span></div></div>
    <div className="howard-admin-list">{(volunteers??[]).map(volunteer=>{const total=totals.get(volunteer.user_id)??{minutes:0,messages:0,sessions:0};return <article className="card help-desk-volunteer-admin-card" key={volunteer.user_id}><div><span className={`status ${volunteer.status}`}>{volunteer.status}</span>{active.has(volunteer.user_id)&&<span className="status active">online now</span>}<h2>{volunteer.display_name}</h2><p>{volunteer.notification_email}</p></div><div className="help-desk-volunteer-metrics"><span><Award/><strong>{volunteer.training_score}%</strong> training</span><span><Clock3/><strong>{Math.floor(total.minutes/60)}h {total.minutes%60}m</strong> credited</span><span><CheckCircle2/><strong>{total.sessions}</strong> completed service records</span><span><strong>{total.messages}</strong> volunteer messages</span></div>{volunteer.status==="revoked"?<><p className="notice error-text"><Ban/>Revoked: {volunteer.revoked_reason}</p><form action={restoreHelpDeskVolunteer}><input type="hidden" name="volunteerId" value={volunteer.user_id}/><button className="button outline">Restore trained access</button></form></>:<form action={revokeHelpDeskVolunteer} className="stack"><input type="hidden" name="volunteerId" value={volunteer.user_id}/><label>Reason to pause and revoke access<textarea name="reason" required minLength={10} maxLength={1000}/></label><button className="button danger-button">Revoke access and release cases</button></form>}</article>})}</div>
  </div></main>;
}
