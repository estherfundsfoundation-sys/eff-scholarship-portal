import type {Metadata} from "next";
import {updateHelpDeskPassword} from "@/app/help-desk/actions";

export const metadata: Metadata = {title: "Create a New Help Desk Password"};

type Query = {context?: string; error?: string};

export default async function HelpDeskResetPassword({searchParams}: {searchParams: Promise<Query>}) {
  const query=await searchParams;
  const context=query.context==="staff"?"staff":"volunteer";
  return <main className="section help-desk-auth-page"><div className="shell" style={{maxWidth:600}}><section className="card"><div className="eyebrow">Secure EFF identity</div><h1>{context==="staff"?"Create a New Help Desk Staff Password":"Reset Your Help Desk Volunteer Account Password"}</h1><p>This password secures your shared EFF identity. Your Help Desk dashboard, permissions, and records remain separate from scholarship activity.</p>{query.error&&<div className="notice error-text">{query.error}</div>}<form action={updateHelpDeskPassword} className="stack"><input type="hidden" name="context" value={context}/><label>New password<input name="password" type="password" minLength={10} required autoComplete="new-password"/></label><button className="button">Update Password</button></form></section></div></main>;
}
