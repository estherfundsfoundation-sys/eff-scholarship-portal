import Link from "next/link";
import {KeyRound,MailCheck,ShieldQuestion,UserPlus} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
import {requestMyLegacyClaimInvitation} from "./actions";

const recoveryMessages:Record<string,{title:string;body:string}> = {
  queued:{
    title:"A fresh private invitation is being sent.",
    body:"Check your inbox, Spam, and Promotions for the newest EFF Name Your Need message. Older claim links were cancelled for your protection.",
  },
  recently_sent:{
    title:"A current invitation was already sent.",
    body:"Please wait up to 10 minutes, then check Spam and Promotions. Use only the newest EFF claim message.",
  },
  already_connected:{
    title:"Your transferred application is already connected.",
    body:"Open your dashboard to continue or review it. Do not create another account or application.",
  },
  not_found:{
    title:"We did not find an imported application under this signed-in email.",
    body:"If you used a different email on the original application, open one Tech Desk ticket so EFF can verify the record without creating a duplicate.",
  },
  staff_review:{
    title:"Your application relationship needs a secure staff review.",
    body:"Do not create another application. Open one Tech Desk ticket and include the program name and the email used on your original submission.",
  },
};

export default async function AccountHelp({
  searchParams,
}:{
  searchParams:Promise<{existing?:string;recovery?:string}>;
}){
  const query=await searchParams;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const recovery=query.recovery?recoveryMessages[query.recovery]:null;

  return <main>
    <section className="resource-hero">
      <div className="shell">
        <div className="eyebrow">No more guessing</div>
        <h1>Let’s get you into <span>your portal.</span></h1>
        <p>Choose the situation that matches what you see. Never send anyone your password, Social Security number, or private claim link.</p>
      </div>
    </section>
    <section className="section white">
      <div className="shell">
        {query.existing==="1"&&<div className="notice"><strong>We found an existing Name Your Need Scholarship application connected to your email address.</strong><br/>Please claim your existing application instead of submitting a new one.</div>}
        {recovery&&<div className="notice" role="status"><strong>{recovery.title}</strong><br/>{recovery.body}</div>}
        {user&&<div className="notice"><strong>Already signed in?</strong><br/>Run the My Portal Checkup to confirm your profile, applications, uploads, requests, and submission status before opening a ticket.<br/><Link className="button outline" href="/portal-checkup">Run My Portal Checkup</Link></div>}
        <div className="account-help-grid">
          <article className="card">
            <UserPlus/>
            <h3>I never created a password</h3>
            <p>Use the newest EFF invitation and select “Create an account.” Register with the exact email address that received the invitation.</p>
            <Link className="button" href="/sign-up">Create my account</Link>
          </article>
          <article className="card">
            <MailCheck/>
            <h3>I submitted through the old application</h3>
            <p>Sign in with the original submission email, then securely request one fresh private claim link. The system will not create a duplicate application.</p>
            {user
              ? <form action={requestMyLegacyClaimInvitation}><button className="button">Send my newest claim link</button></form>
              : <Link className="button" href="/sign-in?next=/account-help">Sign in to recover my application</Link>}
          </article>
          <article className="card">
            <KeyRound/>
            <h3>I created a password before</h3>
            <p>Use password reset once, then open only the newest reset email. Check Spam and Promotions before requesting another link.</p>
            <Link className="button" href="/forgot-password">Reset my password</Link>
          </article>
          <article className="card">
            <ShieldQuestion/>
            <h3>I see Vercel, expired, or another error</h3>
            <p>Do not request Vercel access or create another account. Use the Tech Desk for a secure, tracked diagnosis.</p>
            <Link className="button" href="/tech-desk/open-ticket">Open one Tech Desk ticket</Link>
          </article>
        </div>
        <div className="notice account-help-note">
          <strong>Official portal:</strong> portal.estherfundsfoundation.org. EFF will never ask you to pay a fee to access your application.
        </div>
      </div>
    </section>
  </main>;
}
