import type {Metadata} from "next";
import {updatePassword} from "@/app/auth/actions";

export const metadata:Metadata={title:{absolute:"Choose a New EFF FutureLink Password"}};

export default async function FutureLinkResetPassword({searchParams}:{searchParams:Promise<{error?:string}>}){
  const {error}=await searchParams;
  return <main className="fl-page fl-form-page"><section className="fl-form-hero"><div className="fl-shell"><div className="fl-kicker">My FutureLink</div><h1>Choose a new password.</h1><p>Secure your mentorship account with a password you do not use anywhere else.</p></div></section><div className="fl-shell fl-form-shell">{error&&<div className="fl-alert" role="alert">{error}</div>}<form action={updatePassword} className="fl-form"><section><span className="fl-step-label">Protected account update</span><h2>Create your password</h2><div className="fl-fields"><label>New password<input name="password" type="password" minLength={10} required autoComplete="new-password"/><small>Use at least 10 characters.</small></label></div><button className="fl-submit">Update my FutureLink password</button></section></form></div></main>;
}
