import type {Metadata} from "next";
import Link from "next/link";
import {BadgeHelp, KeyRound, LifeBuoy, ShieldCheck, UserRoundCheck} from "lucide-react";

export const metadata: Metadata = {title: "Help With National Help Desk Access"};

export default function HelpDeskAccountHelp() {
  return (
    <main className="section white">
      <div className="shell">
        <div className="eyebrow">Product-specific account help</div>
        <h1>Help With National Help Desk Access</h1>
        <p className="lead">Choose the situation that matches your National Student Help Desk role. These instructions do not change or transfer scholarship applications.</p>
        <div className="account-help-grid help-desk-account-grid">
          <article className="card" id="student"><LifeBuoy/><h3>I opened a Help Desk case</h3><p>Get help finding a case number, resending verification, replacing an expired secure link, correcting an email, reopening a case, or accessing messages.</p><Link className="button" href="/help-desk/access">Access or recover my case</Link></article>
          <article className="card" id="volunteer"><UserRoundCheck/><h3>I am a Help Desk volunteer</h3><p>Get help with your volunteer account, training, 100% assessment, certification, approval status, console, shift access, suspension, or recertification.</p><Link className="button" href="/help-desk/volunteer/sign-in">Volunteer access</Link></article>
          <article className="card" id="staff"><ShieldCheck/><h3>I am EFF Help Desk staff</h3><p>Get help with staff authorization, multi-factor authentication, supervisor access, an administrative role, or a locked account.</p><Link className="button" href="/help-desk/staff/sign-in">Staff and supervisor access</Link></article>
          <article className="card"><KeyRound/><h3>I need to reset my password</h3><p>Your secure EFF sign-in uses one password, but each EFF product keeps its own dashboard, permissions, and records.</p><Link className="button" href="/help-desk/password-reset">Reset Help Desk access</Link></article>
          <article className="card"><BadgeHelp/><h3>I am actually looking for a scholarship application</h3><p>Scholarship application access, old-application claims, status, awards, and reviewer support belong in the Scholarship Portal.</p><Link className="button outline" href="/account-help">Scholarship Portal account help</Link></article>
        </div>
        <div className="notice"><strong>Still blocked?</strong> Email <a href="mailto:nationals@estherfundsinc.org?subject=National%20Help%20Desk%20Account%20Help">nationals@estherfundsinc.org</a> with your Help Desk case number if you have one. Do not email private records or account credentials.</div>
      </div>
    </main>
  );
}
