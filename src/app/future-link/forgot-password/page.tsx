import type {Metadata} from "next";
import Link from "next/link";
import {requestPasswordReset} from "@/app/auth/actions";

export const metadata:Metadata={title:{absolute:"Reset Your EFF FutureLink Password"}};

export default async function FutureLinkForgotPassword({searchParams}:{searchParams:Promise<{message?:string;error?:string}>}){
  const {message,error}=await searchParams;
  return <main className="fl-page fl-form-page"><section className="fl-form-hero"><div className="fl-shell"><div className="fl-kicker">My FutureLink</div><h1>Reset your password.</h1><p>We will send one secure, time-limited recovery link to the email connected to your mentorship account.</p></div></section><div className="fl-shell fl-form-shell">{error&&<div className="fl-alert" role="alert">{error}</div>}{message&&<div className="fl-alert success" role="status">{message}</div>}<form action={requestPasswordReset} className="fl-form"><section><span className="fl-step-label">Secure account recovery</span><h2>Find your FutureLink account</h2><div className="fl-fields"><label>Email address<input name="email" type="email" required autoComplete="email"/></label></div><button className="fl-submit">Send my secure reset link</button><p className="fl-help">For privacy, the confirmation looks the same whether or not an account exists.</p><p><Link href="/sign-in">Return to FutureLink sign in</Link>.</p></section></form></div></main>;
}
