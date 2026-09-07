import type {Metadata} from "next";
import Link from "next/link";
import {signUp} from "@/app/auth/actions";

export const metadata:Metadata={title:{absolute:"Create Your EFF FutureLink Account"}};

export default async function FutureLinkSignUp({searchParams}:{searchParams:Promise<{error?:string;next?:string}>}){
  const p=await searchParams;
  const destination=p.next??"/apply";
  return <main className="fl-page fl-form-page"><section className="fl-form-hero"><div className="fl-shell"><div className="fl-kicker">EFF FutureLink</div><h1>Create your mentorship account.</h1><p>One secure account gives you access to your application, matches, agreements, sessions, and verified service record.</p></div></section><div className="fl-shell fl-form-shell">{p.error&&<div className="fl-alert" role="alert">{p.error}</div>}<form action={signUp} className="fl-form"><section><span className="fl-step-label">Secure registration</span><h2>Begin your FutureLink profile</h2><input type="hidden" name="next" value={destination}/><div className="fl-fields"><label>Legal name<input name="legalName" autoComplete="name" required minLength={2}/></label><label>Preferred name <small>Optional</small><input name="preferredName" autoComplete="nickname"/></label><label>Email address<input name="email" type="email" autoComplete="email" required/></label><label>Password<input name="password" type="password" autoComplete="new-password" required minLength={10}/><small>Use at least 10 characters.</small></label></div><button className="fl-submit">Create my FutureLink account</button><p className="fl-help">We will email you a secure verification link before you can continue.</p><p>Already registered? <Link href={`/sign-in?next=${encodeURIComponent(destination)}`}>Sign in to FutureLink</Link>.</p></section></form></div></main>;
}
