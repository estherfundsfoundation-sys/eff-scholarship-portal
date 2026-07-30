import type {Metadata} from "next";
import Link from "next/link";
import {AlertTriangle, LockKeyhole, ShieldCheck} from "lucide-react";
import {signInTechDeskStaff} from "@/app/tech-desk/actions";
import {safeTechDeskDestination} from "@/lib/tech-desk";

export const metadata: Metadata = {title: "EFF Tech Desk Staff Access"};

type Query = {error?: string; message?: string; denied?: string; next?: string};

export default async function TechDeskStaffSignIn({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const query = await searchParams;
  const next = safeTechDeskDestination(query.next);
  return (
    <main className="section">
      <div className="shell tech-desk-auth-grid">
        <section className="card">
          <div className="eyebrow">Restricted technical operations</div>
          <h1>EFF Tech Desk Staff Access</h1>
          <p>
            Authorized staff may review tickets, send secure updates, run
            read-only diagnostics, monitor official platforms, and approve
            remediation proposals.
          </p>
          {query.error && (
            <div className="notice" role="alert"><AlertTriangle/>{query.error}</div>
          )}
          {query.message && (
            <div className="notice" role="status">{query.message}</div>
          )}
          {query.denied && (
            <div className="notice" role="alert">
              <LockKeyhole/>
              <span>
                <strong>Your EFF identity is active, but it does not have a Tech
                Desk role.</strong>{" "}
                An authorized Tech Desk administrator must grant separate access.
              </span>
            </div>
          )}
          <form action={signInTechDeskStaff} className="stack tech-desk-auth-form">
            <input type="hidden" name="next" value={next}/>
            <label>
              Authorized EFF email
              <input name="email" type="email" required autoComplete="email"/>
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
            <button className="button">
              <ShieldCheck/> Sign In to Tech Desk Administration
            </button>
          </form>
          <p><Link href="/tech-desk/password-reset">Reset staff password</Link></p>
          <p><Link href="/tech-desk">Return to the EFF Tech Desk</Link></p>
        </section>
        <aside className="tech-desk-auth-aside">
          <ShieldCheck/>
          <h2>Production safety boundary</h2>
          <ul>
            <li>Read-only health checks may run automatically.</li>
            <li>Passwords, verification codes, and provider secrets are never requested.</li>
            <li>Vercel, GitHub, Supabase, DNS, data, role, and code changes require authorization.</li>
            <li>Every staff message and remediation decision is recorded.</li>
          </ul>
          <Link className="button outline" href="/help-desk/admin">
            National Student Help Desk Administration
          </Link>
        </aside>
      </div>
    </main>
  );
}
