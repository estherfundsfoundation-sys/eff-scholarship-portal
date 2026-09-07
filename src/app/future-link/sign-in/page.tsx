import type {Metadata} from "next";
import Link from "next/link";
import {signIn} from "@/app/auth/actions";

export const metadata:Metadata={title:{absolute:"Sign In to EFF FutureLink"}};

export default async function FutureLinkSignIn({searchParams}:{searchParams:Promise<{error?:string;message?:string;next?:string}>}){
  const p=await searchParams;
  const destination=p.next??"/dashboard";
  return <main className="fl-page fl-form-page"><section className="fl-form-hero"><div className="fl-shell"><div className="fl-kicker">My FutureLink</div><h1>Welcome back.</h1><p>Open your private mentorship dashboard and continue where you left off.</p></div></section><div className="fl-shell fl-form-shell">{p.error&&<div className="fl-alert" role="alert">{p.error}</div>}{p.message&&<div className="fl-alert success" role="status">{p.message}</div>}<form action={signIn} className="fl-form"><section><span className="fl-step-label">Secure sign in</span><h2>Access your mentorship account</h2><input type="hidden" name="next" value={destination}/><div className="fl-fields"><label>Email address<input name="email" type="email" autoComplete="email" required/></label><label>Password<input name="password" type="password" autoComplete="current-password" required/></label></div><button className="fl-submit">Sign in to FutureLink</button><p><Link href="/forgot-password">Forgot your password?</Link></p><p>New to FutureLink? <Link href="/sign-up?next=/apply">Create your account</Link>.</p></section></form></div></main>;
}
