import {NextRequest,NextResponse} from "next/server";
import {emailFrom,getResend} from "@/lib/email";
import {createHowardPacketUrl} from "@/lib/howard-packet-token";
import {createAdminClient} from "@/lib/supabase/admin";

const sleep=(milliseconds:number)=>new Promise(resolve=>setTimeout(resolve,milliseconds));
const escapeHtml=(value:string)=>value.replace(/[&<>'"]/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[character]!));

export async function GET(request:NextRequest){
  if(!process.env.CRON_SECRET||request.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:"Unauthorized"},{status:401});
  const admin=createAdminClient();
  const {data:cases,error}=await admin.from("howard_help_cases")
    .select("id,case_code,student_name,preferred_name,email,status")
    .not("verified_at","is",null)
    .in("status",["advocacy_sent","howard_review","delivery_failed"])
    .order("created_at",{ascending:true})
    .limit(100);
  if(error)return NextResponse.json({error:"Howard cases are unavailable."},{status:500});
  const ids=(cases??[]).map(record=>record.id);
  if(!ids.length)return NextResponse.json({eligible:0,sent:0,failed:0});
  const {data:events}=await admin.from("audit_events")
    .select("target_id")
    .eq("action","howard_packet_email_sent")
    .eq("target_type","howard_help_case")
    .in("target_id",ids);
  const alreadySent=new Set((events??[]).map(event=>event.target_id));
  const pending=(cases??[]).filter(record=>!alreadySent.has(record.id)).slice(0,20);
  const resend=getResend();
  let sent=0;
  let failed=0;
  for(const [index,record] of pending.entries()){
    if(index)await sleep(700);
    const packetUrl=createHowardPacketUrl(record.id);
    const firstName=record.preferred_name||record.student_name;
    const safeName=escapeHtml(firstName);
    const safeCase=escapeHtml(record.case_code);
    const result=await resend.emails.send({
      from:emailFrom,
      to:record.email,
      replyTo:"nationals@estherfundsinc.org",
      subject:`Your EFF Keep Your Seat advocacy packet - ${record.case_code}`,
      html:`<div style="font-family:Arial,sans-serif;line-height:1.65;color:#2d1748;max-width:640px;margin:0 auto">
<p style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7b48a6">Esther Funds Foundation · Howard Help Desk</p>
<h1 style="color:#42127F;font-size:28px;line-height:1.2">Your advocacy packet is ready.</h1>
<p>Hello ${safeName},</p>
<p>Thank you for trusting Esther Funds Foundation. EFF does not underestimate the urgency or importance of your need.</p>
<p>Your private Keep Your Seat Advocacy Packet includes your EFF letterhead advocacy request, student-reported timeline, personalized action plan, Howard contact map, evidence checklist, call script, follow-up email template, issue-specific addendum, and case-verification letter.</p>
<p><a href="${packetUrl}" style="display:inline-block;background:#42127F;color:#fff;padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:700">Download my private advocacy packet</a></p>
<p style="padding:12px 14px;background:#f5f0e6;border-left:4px solid #42127F"><strong>Keep this link private.</strong> It provides access to student-reported case information and expires in 30 days. Review the packet for accuracy before sharing it.</p>
<p>EFF provides educational advocacy. Howard University controls enrollment decisions, and this packet does not guarantee reinstatement or funding.</p>
<p>Case number: <strong>${safeCase}</strong></p>
<p>With care,<br/><strong>Esther Funds Foundation</strong><br/>Every Future Fulfilled</p>
</div>`,
      text:`Hello ${firstName},

Thank you for trusting Esther Funds Foundation. EFF does not underestimate the urgency or importance of your need.

Your private Keep Your Seat Advocacy Packet is ready:
${packetUrl}

The packet includes your EFF letterhead advocacy request, student-reported timeline, personalized action plan, Howard contact map, evidence checklist, call script, follow-up email template, issue-specific addendum, and case-verification letter.

Keep this link private. It provides access to student-reported case information and expires in 30 days. Review the packet for accuracy before sharing it.

EFF provides educational advocacy. Howard University controls enrollment decisions, and this packet does not guarantee reinstatement or funding.

Case number: ${record.case_code}

Esther Funds Foundation
Every Future Fulfilled`
    });
    if(result.error){
      console.error("Howard packet email could not be sent",{caseCode:record.case_code,error:result.error.name});
      failed+=1;
      continue;
    }
    await admin.from("audit_events").insert({
      actor_id:null,
      action:"howard_packet_email_sent",
      target_type:"howard_help_case",
      target_id:record.id,
      metadata_safe:{case_code:record.case_code,delivery:"secure_link",provider_id:result.data?.id||null}
    });
    sent+=1;
  }
  return NextResponse.json({eligible:cases?.length??0,pending:pending.length,sent,failed});
}

export const maxDuration=60;
