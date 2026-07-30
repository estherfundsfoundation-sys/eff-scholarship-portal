import type {Metadata} from "next";
import Link from "next/link";
import {KeyRound, Mail, ShieldCheck, TicketCheck} from "lucide-react";

export const metadata: Metadata = {title: "EFF Tech Desk Account Help"};

export default function TechDeskAccountHelp() {
  return (
    <main className="section">
      <div className="shell" style={{maxWidth: 920}}>
        <div className="eyebrow">Choose the correct secure path</div>
        <h1>EFF Tech Desk Account Help</h1>
        <div className="tech-desk-card-grid">
          <article>
            <TicketCheck/>
            <h2>Continue a Ticket</h2>
            <p>Use the EFF-TECH ticket number and verified email.</p>
            <Link className="button" href="/tech-desk/access">Send Secure Ticket Link</Link>
          </article>
          <article>
            <KeyRound/>
            <h2>Tech Desk Staff Password</h2>
            <p>Authorized personnel can request a contextual password-reset link.</p>
            <Link className="button" href="/tech-desk/password-reset">Reset Staff Password</Link>
          </article>
          <article>
            <Mail/>
            <h2>Email Did Not Arrive</h2>
            <p>Check Spam, Promotions, Updates, and institutional quarantine first.</p>
            <Link className="button outline" href="/tech-desk/knowledge">Review Email Steps</Link>
          </article>
        </div>
        <div className="notice">
          <ShieldCheck/>
          <span>
            Scholarship applications and National Student Help Desk cases use
            different records. Do not create duplicate accounts to fix a Tech Desk issue.
          </span>
        </div>
      </div>
    </main>
  );
}
