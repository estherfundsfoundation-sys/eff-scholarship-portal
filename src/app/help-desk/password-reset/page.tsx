import type {Metadata} from "next";
import Link from "next/link";
import {KeyRound, ShieldCheck} from "lucide-react";
import {requestHelpDeskPasswordReset} from "@/app/help-desk/actions";

export const metadata: Metadata = {title: "Reset National Help Desk Access"};

type Query = {context?: string; sent?: string; error?: string};

export default async function HelpDeskPasswordReset({searchParams}: {searchParams: Promise<Query>}) {
  const query=await searchParams;
  const context=query.context==="staff"?"staff":"volunteer";
  return <main className="section help-desk-auth-page"><div className="shell" style={{maxWidth:600}}><section className="card"><KeyRound/><div className="eyebrow">National Help Desk account recovery</div><h1>{context==="staff"?"Reset National Help Desk Staff Access":"Reset Your Help Desk Volunteer Account Password"}</h1><p>Enter the email connected to your secure EFF identity. For privacy, the confirmation is the same whether or not the account exists.</p>{query.sent&&<div className="notice" role="status">If that email has an account, a product-specific reset link is on its way. Use only the newest message.</div>}{query.error&&<div className="notice error-text">{query.error}</div>}<form action={requestHelpDeskPasswordReset} className="stack"><input type="hidden" name="context" value={context}/><label>Email address<input type="email" name="email" required autoComplete="email"/></label><button className="button">Send Secure Reset Link</button></form><div className="notice"><ShieldCheck/><span>Your secure EFF sign-in uses one password, but each EFF product keeps its own dashboard, permissions, and records.</span></div><Link className="card-link" href={context==="staff"?"/help-desk/staff/sign-in":"/help-desk/volunteer/sign-in"}>Return to {context==="staff"?"Help Desk Staff Access":"Volunteer Access"}</Link></section></div></main>;
}
