import type {Metadata} from "next";
import Link from "next/link";
import {KeyRound, LockKeyhole, ShieldCheck} from "lucide-react";
import {signInHelpDeskVolunteer} from "@/app/help-desk/actions";
import {safeHelpDeskDestination} from "@/lib/help-desk-context";

export const metadata: Metadata = {title: "Help Desk Volunteer Access"};

type Query = {error?: string; message?: string; next?: string; existing?: string};

export default async function VolunteerSignIn({searchParams}: {searchParams: Promise<Query>}) {
  const query = await searchParams;
  const next = safeHelpDeskDestination(query.next, "volunteer");
  return <main className="section help-desk-auth-page"><div className="shell help-desk-auth-grid"><section className="card"><div className="eyebrow">Volunteer identity</div><h1>EFF National Help Desk Volunteer Access</h1><p>Complete your training, manage your availability, respond to assigned student cases, and review your verified service record.</p>{query.error&&<div className="notice error-text" role="alert">{query.error}</div>}{query.message&&<div className="notice" role="status">{query.message}</div>}{query.existing&&<div className="notice"><strong>An EFF account already exists for this email.</strong><br/>Sign in to continue your National Help Desk volunteer onboarding.</div>}<form action={signInHelpDeskVolunteer} className="stack"><input type="hidden" name="next" value={next}/><label>Email address<input name="email" type="email" autoComplete="email" required/></label><label>Password<input name="password" type="password" autoComplete="current-password" required/></label><button className="button"><LockKeyhole/> Sign In to Volunteer</button></form><div className="help-desk-secondary-links"><Link href="/help-desk/volunteer/create-account">Start Volunteer Onboarding</Link><Link href="/help-desk/password-reset?context=volunteer">Forgot My Password</Link><Link href="/help-desk/account-help#volunteer">Help With Volunteer Access</Link></div></section><aside className="help-desk-auth-aside"><ShieldCheck/><h2>Already have another verified EFF account?</h2><p>Use the same email address and password. Your Help Desk volunteer training and access remain separate from scholarship activity.</p><hr/><KeyRound/><h3>One secure identity. Separate EFF workspaces.</h3><p>Signing in here will route you only to volunteer onboarding, training, approval status, recertification, or the Volunteer Console.</p><Link className="card-link" href="/sign-in">Looking for a scholarship application?</Link></aside></div></main>;
}
