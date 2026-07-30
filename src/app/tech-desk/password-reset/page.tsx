import type {Metadata} from "next";
import Link from "next/link";
import {KeyRound, ShieldCheck} from "lucide-react";
import {requestTechDeskStaffPasswordReset} from "@/app/tech-desk/actions";

export const metadata: Metadata = {title: "Reset EFF Tech Desk Staff Access"};

export default async function TechDeskPasswordReset({
  searchParams,
}: {
  searchParams: Promise<{sent?: string}>;
}) {
  const query = await searchParams;
  return (
    <main className="section">
      <div className="shell" style={{maxWidth: 620}}>
        <section className="card">
          <KeyRound/>
          <div className="eyebrow">Restricted account recovery</div>
          <h1>Reset EFF Tech Desk Staff Access</h1>
          <p>
            Enter the email connected to your EFF identity. The confirmation is
            intentionally the same whether or not the address has Tech Desk access.
          </p>
          {query.sent && (
            <div className="notice" role="status">
              If an eligible account exists, a secure reset link is on its way.
              Use only the newest email.
            </div>
          )}
          <form action={requestTechDeskStaffPasswordReset} className="stack">
            <label>
              Authorized email
              <input name="email" type="email" required autoComplete="email"/>
            </label>
            <button className="button">Send Secure Reset Link</button>
          </form>
          <div className="notice">
            <ShieldCheck/>
            Tech Desk permissions remain separate from scholarship and National
            Student Help Desk permissions.
          </div>
          <Link href="/tech-desk/staff/sign-in">Return to Tech Desk Staff Access</Link>
        </section>
      </div>
    </main>
  );
}
