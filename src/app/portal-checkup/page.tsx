import Link from "next/link";
import {AlertTriangle,CheckCircle2,FileCheck2,KeyRound,UploadCloud,UserRoundCheck} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
import {applicantLabels,type ApplicationStatus} from "@/lib/domain";
import {recoverImportedApplication} from "./actions";

const recoveryMessages:Record<string,string>={
  queued:"A fresh private claim link is queued. Check Inbox, Spam, and Promotions and use only the newest EFF message.",
  recently_sent:"A current invitation was sent recently. Wait up to 10 minutes, check Spam and Promotions, and use only the newest message.",
  already_connected:"Your imported application is already connected to this account. Return to your dashboard; do not create another application.",
  not_found:"No imported application matched this exact signed-in email. If you used another email, open one Tech Desk ticket for secure staff verification.",
  staff_review:"This record needs secure staff review. Do not create another account or application; open one Tech Desk ticket.",
};

export default async function PortalCheckup({searchParams}:{searchParams:Promise<{recovery?:string}>}){
  const query=await searchParams;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const [profileResult,applicationsResult,requestsResult]=await Promise.all([
    supabase.from("profiles").select("legal_name,primary_email,institution,degree_level,major,phone").eq("id",user!.id).maybeSingle(),
    supabase.from("applications").select("id,status,submitted_at,updated_at,program_cycles(name,programs(name))").order("updated_at",{ascending:false}),
    supabase.from("information_requests").select("id,item,due_at,application_id").is("resolved_at",null).order("created_at",{ascending:false}),
  ]);
  const profile=profileResult.data;
  const applications=applicationsResult.data??[];
  const requests=requestsResult.data??[];
  const missingProfile=[!profile?.legal_name&&"legal name",!profile?.institution&&"school",!profile?.degree_level&&"degree level",!profile?.phone&&"phone number"].filter(Boolean) as string[];
  const queryFailed=Boolean(profileResult.error||applicationsResult.error||requestsResult.error);
  const recovery=query.recovery?recoveryMessages[query.recovery]:null;

  return <main className="section white"><div className="shell">
    <Link className="card-link" href="/dashboard">← Return to dashboard</Link>
    <div className="eyebrow">Signed-in self-service</div><h1>My Portal Checkup</h1>
    <p className="lead">Use this page before opening a Tech Desk ticket. It checks the account you are using and routes common problems to the safest fix.</p>
    {recovery&&<div className="notice" role="status"><strong>Application recovery update</strong><br/>{recovery}</div>}
    {queryFailed&&<div className="notice" role="alert"><strong>Some portal records could not be checked.</strong><br/>Refresh once. If this message remains, open one Tech Desk ticket and do not create a duplicate account or application.</div>}
    <div className="portal-checkup-grid">
      <article className="card"><CheckCircle2/><div><div className="eyebrow">Account</div><h3>Signed in successfully</h3><p><strong>{user?.email}</strong></p><p className="muted">Use this same email for your EFF application. Never share a password, code, or private claim link.</p><Link className="button outline" href="/forgot-password"><KeyRound size={17}/> Reset password</Link></div></article>
      <article className="card">{missingProfile.length?<AlertTriangle/>:<UserRoundCheck/>}<div><div className="eyebrow">Profile</div><h3>{missingProfile.length?"Profile needs attention":"Profile is ready"}</h3><p className="muted">{missingProfile.length?`Add your ${missingProfile.join(", ")} before submitting.`:"Your reusable applicant profile has the core information needed for submission."}</p><Link className="button outline" href="/profile">{missingProfile.length?"Complete profile":"Review profile"}</Link></div></article>
      <article className="card"><FileCheck2/><div><div className="eyebrow">Applications</div><h3>{applications.length?`${applications.length} application${applications.length===1?"":"s"} connected`:"No application connected"}</h3>{applications.length?<div className="checkup-application-list">{applications.map(application=>{const cycle=application.program_cycles as unknown as {programs:{name:string}}|null;const editable=["draft","additional_information_needed"].includes(application.status);return <div key={application.id}><strong>{cycle?.programs?.name??"EFF application"}</strong><span>{applicantLabels[application.status as ApplicationStatus]??application.status}</span><Link className="card-link" href={editable?`/applications/${application.id}/edit`:`/applications/${application.id}`}>{editable?"Continue or correct":"View receipt and status"}</Link></div>})}</div>:<><p className="muted">If you submitted through an older EFF form, recover it below. Otherwise, view currently available programs.</p><Link className="button outline" href="/programs">View programs</Link></>}</div></article>
      <article className="card"><UploadCloud/><div><div className="eyebrow">Uploads and corrections</div><h3>{requests.length?`${requests.length} action item${requests.length===1?"":"s"}`:"No open requests"}</h3>{requests.length?<>{requests.map(request=><div className="notice" key={request.id}><strong>{request.item}</strong>{request.due_at&&<><br/>Due {new Date(request.due_at).toLocaleDateString()}</>}<br/><Link className="card-link" href={`/applications/${request.application_id}/edit`}>Correct answers or upload documents</Link></div>)}</>:<p className="muted">Accepted files are PDF, JPG, PNG, or WebP up to 10 MB each. Your answers remain saved if an upload fails.</p>}</div></article>
    </div>
    <section className="card checkup-recovery"><div><div className="eyebrow">Submitted through an older form?</div><h3>Recover—do not duplicate—your application.</h3><p>While signed in with the exact email used on the original submission, request one fresh private claim link. Existing links are safely replaced.</p></div><form action={recoverImportedApplication}><button className="button">Check and recover my application</button></form></section>
    <section className="notice checkup-final"><strong>Still not fixed?</strong><br/>Open one Tech Desk ticket with the exact page, error text, deadline, and a redacted screenshot. Do not include Social Security numbers, passwords, codes, tax returns, or bank information.<br/><Link className="button outline" href="/tech-desk/open-ticket">Open one Tech Desk ticket</Link></section>
  </div></main>;
}
