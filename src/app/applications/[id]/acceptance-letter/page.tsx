import Image from "next/image";
import Link from "next/link";
import {notFound} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {PrintLetterButton} from "./print-letter-button";

type Profile={legal_name:string|null;preferred_name:string|null};
type Decision={applicant_explanation:string|null;confirmed_at:string};
type Cycle={name:string;programs:{name:string}|null};

export default async function AcceptanceLetterPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)notFound();

  const {data:application}=await supabase.from("applications").select("id,applicant_id,status,profiles!applications_applicant_id_fkey(legal_name,preferred_name),program_cycles(name,programs(name)),decisions(applicant_explanation,confirmed_at)").eq("id",id).single();
  if(!application||application.status!=="approved")notFound();

  if(application.applicant_id!==user.id){
    const {data:staffRole}=await supabase.from("user_roles").select("id").eq("user_id",user.id).eq("active",true).in("role",["reviewer","finance","program_admin","super_admin"]).limit(1).maybeSingle();
    if(!staffRole)notFound();
  }

  const profile=application.profiles as unknown as Profile;
  const cycle=application.program_cycles as unknown as Cycle|null;
  const decision=(application.decisions as unknown as Decision[])?.[0];
  const name=profile.legal_name??profile.preferred_name??"Applicant";
  const decidedAt=decision?.confirmed_at?new Date(decision.confirmed_at):new Date();

  return <main className="section acceptance-letter-page"><div className="shell" style={{maxWidth:900}}>
    <div className="acceptance-letter-actions"><Link className="card-link" href={`/applications/${id}`}>← Application</Link><PrintLetterButton/></div>
    <article className="acceptance-letter">
      <header><Image src="/brand/eff-logo.png" alt="Esther Funds Foundation" width={92} height={92}/><div><strong>ESTHER FUNDS FOUNDATION</strong><span>Every Future Fulfilled.</span><small>Verified 501(c)(3) nonprofit · EIN 93-4917509</small></div></header>
      <div className="letter-date">{decidedAt.toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</div>
      <p>Dear {name},</p>
      <h1>Application Acceptance</h1>
      <p>Congratulations. On behalf of Esther Funds Foundation, we are pleased to confirm that your application for <strong>{cycle?.programs?.name??"an Esther Funds Foundation program"}</strong>{cycle?.name?` — ${cycle.name}`:""} has been approved.</p>
      {decision?.applicant_explanation&&<p>{decision.applicant_explanation}</p>}
      <p>This letter confirms approval of your application. It does not by itself promise or confirm a scholarship amount, payment, eligibility for a specific expense, or disbursement date. If EFF issues an award, the verified amount, conditions, acceptance deadline, and payment status will appear separately in your secure portal.</p>
      <p>Please keep your contact information current and complete any next steps shown in the portal. Do not email passwords, verification codes, Social Security numbers, tax returns, or full financial account information.</p>
      <p>We are grateful for the opportunity to support your educational journey.</p>
      <div className="letter-signature"><span>With care,</span><strong>Shayna Vincent</strong><span>Executive Director</span><span>Esther Funds Foundation</span></div>
      <footer><span>Application ID: {application.id}</span><span>portal.estherfundsfoundation.org</span><span>nationals@estherfundsinc.org</span></footer>
    </article>
  </div></main>;
}
