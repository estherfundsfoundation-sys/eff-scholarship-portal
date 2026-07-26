"use server";import {revalidatePath} from "next/cache";import {redirect} from "next/navigation";import {requireAdmin,requireSuperAdmin} from "@/lib/auth/staff";import {createAdminClient} from "@/lib/supabase/admin";import partnerOutreach from "@/data/partner-outreach-audience.json";
export async function saveTemplate(formData:FormData){const {supabase,user}=await requireAdmin();const id=String(formData.get("template_id"));const subject=String(formData.get("subject")??"").trim();const body=String(formData.get("body")??"").trim();if(!subject||!body)throw new Error("Subject and body are required.");const {error}=await supabase.from("email_templates").update({subject,body}).eq("id",id);if(error)throw new Error("Template could not be saved.");await supabase.from("audit_events").insert({actor_id:user.id,action:"email_template_updated",target_type:"email_template",target_id:id});revalidatePath("/admin/communications")}
export async function retryFailedMessage(formData:FormData){const {supabase}=await requireAdmin();const id=String(formData.get("message_id")??"");const {error}=await supabase.rpc("retry_failed_message",{p_message_id:id});if(error)throw new Error(error.message);revalidatePath("/admin/communications")}

const partnerSubject="Invitation for {{name}}: Become a Free Every Future Fulfilled Partner Campus";
const partnerBody=`<p>Hello {{name}} Student Success Team,</p>
<p>Esther Funds Foundation invites your institution to become an <strong>Every Future Fulfilled Partner Campus</strong>—a national college-continuity partnership designed around one promise: before a student stops out because of a solvable barrier, we step in together.</p>
<p><strong>Participation is 100% free.</strong> There is no membership fee, setup fee, or student referral fee.</p>
<p>Partner campuses receive:</p>
<ul>
<li>A free institutional account and immediate public recognition, including the school logo and partnership profile in the EFF national directory.</li>
<li>A direct referral pathway to the EFF National Student Help Desk for students facing enrollment, financial-aid, billing, housing, document, or basic-needs barriers.</li>
<li>Private student case numbers, document-gathering guidance, routing to the correct department, and follow-up support.</li>
<li>Consent-based EFF advocacy and communication with the appropriate campus office when a student needs help navigating a barrier.</li>
<li>Resource matching and review for limited emergency essentials support, including school supplies or groceries, subject to eligibility and available funding.</li>
<li>National recognition for pledging to intervene before preventable withdrawal, plus a pathway toward the earned EFF Institute for Student Continuity designation.</li>
</ul>
<p>The partnership does not require a college to reverse a decision, guarantee aid, share protected records without student consent, or promise a particular outcome.</p>
<p><strong>Learn about the partnership:</strong> <a href="https://portal.estherfundsfoundation.org/partners">portal.estherfundsfoundation.org/partners</a><br>
<strong>Create the free institution account:</strong> <a href="https://portal.estherfundsfoundation.org/partners/join">portal.estherfundsfoundation.org/partners/join</a></p>
<p>If another office leads student success, retention, basic needs, enrollment management, or student affairs at your institution, please forward this invitation to that team.</p>
<p>With purpose,<br><strong>Shayna Vincent</strong><br>Founder &amp; Executive Director<br>Esther Funds Foundation<br>Every Future Fulfilled</p>
<p style="font-size:12px;color:#6b6174">If your institution does not wish to receive partnership updates, reply “remove” and EFF will add this address to its suppression list.</p>`;

async function readAll(admin:ReturnType<typeof createAdminClient>,table:string,columns:string){
  const rows:Record<string,unknown>[]=[];
  for(let offset=0;offset<20000;offset+=1000){
    const {data,error}=await admin.from(table).select(columns).range(offset,offset+999);
    if(error)throw new Error(`Could not read ${table}.`);
    rows.push(...((data??[]) as unknown as Record<string,unknown>[]));
    if((data?.length??0)<1000)break;
  }
  return rows;
}

export async function queueNationalPartnerOutreach(){
  const {user}=await requireSuperAdmin();
  const admin=createAdminClient();
  const {data:template}=await admin.from("email_templates").select("id").is("program_id",null).eq("event_key","partner_invitation").eq("version",1).maybeSingle();
  if(!template){
    const {error}=await admin.from("email_templates").insert({program_id:null,event_key:"partner_invitation",subject:partnerSubject,body:partnerBody,version:1});
    if(error)throw new Error("The partner invitation template could not be created.");
  }
  const [institutions,contacts,suppressions]=await Promise.all([
    readAll(admin,"college_directory","unitid,name,active"),
    readAll(admin,"college_contact_directory","unitid,department_key,email,verification_status,last_checked_at"),
    readAll(admin,"email_suppressions","email")
  ]);
  const schools=new Map(institutions.filter(row=>row.active===true).map(row=>[Number(row.unitid),String(row.name)]));
  const blocked=new Set(suppressions.map(row=>String(row.email).toLowerCase()));
  const priority:Record<string,number>={student_advocacy:1,basic_needs:2,financial_aid:3,registrar:4,student_accounts:5};
  const valid=/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  const excluded=/(^|[._-])(no-?reply|do-?not-?reply|test|testing)([._@-]|$)/i;
  const chosen=new Map<number,{email:string;rank:number;checked:string}>();
  for(const row of contacts){
    const unitid=Number(row.unitid),email=String(row.email??"").trim().toLowerCase(),key=String(row.department_key??"");
    const rank=priority[key]??99;
    if(!schools.has(unitid)||rank===99||row.verification_status!=="verified"||!valid.test(email)||excluded.test(email)||blocked.has(email))continue;
    const checked=String(row.last_checked_at??"");
    const current=chosen.get(unitid);
    if(!current||rank<current.rank||(rank===current.rank&&checked>current.checked))chosen.set(unitid,{email,rank,checked});
  }
  for(const record of partnerOutreach.audience){
    const email=record.email.trim().toLowerCase(),rank=priority[record.department_key]??99;
    if(!valid.test(email)||excluded.test(email)||blocked.has(email))continue;
    schools.set(record.unitid,record.name);
    const current=chosen.get(record.unitid);
    if(!current||rank<current.rank)chosen.set(record.unitid,{email,rank,checked:partnerOutreach.generated_at});
  }
  const now=new Date().toISOString();
  const messages=[...chosen].map(([unitid,contact])=>({
    recipient:contact.email,
    idempotency_key:`partner-invitation-2026:${unitid}`,
    status:"queued",
    payload_private:{name:schools.get(unitid),application_path:"/partners/join"},
    template_key:"partner_invitation",
    next_attempt_at:now
  }));
  let queued=0;
  for(let index=0;index<messages.length;index+=250){
    const {data,error}=await admin.from("messages").upsert(messages.slice(index,index+250),{onConflict:"idempotency_key",ignoreDuplicates:true}).select("id");
    if(error)throw new Error("The national invitation queue could not be created.");
    queued+=data?.length??0;
  }
  await admin.from("audit_events").insert({actor_id:user.id,action:"national_partner_outreach_queued",target_type:"partner_campaign",target_id:"every_future_fulfilled_2026",metadata_safe:{queued,eligible_institutions:messages.length,researched_hbcus:partnerOutreach.hbcu,researched_pwis_and_other:partnerOutreach.pwi_and_other,audience_policy:"one verified student-support contact per active U.S. institution"}});
  revalidatePath("/admin/communications");
  redirect(`/admin/communications?partnerQueued=${queued}&partnerEligible=${messages.length}`);
}
