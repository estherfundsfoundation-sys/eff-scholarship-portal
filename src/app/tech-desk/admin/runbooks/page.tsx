import type {Metadata} from "next";
import Link from "next/link";
import {BookOpenCheck, LockKeyhole, Search, ShieldCheck, Wrench} from "lucide-react";
import {requireTechDeskStaff} from "@/lib/tech-desk-server";
import {techDeskVolunteerRunbooks} from "@/lib/tech-desk-guides";

export const metadata: Metadata = {title: "Tech Volunteer Runbooks"};
export const dynamic = "force-dynamic";

export default async function TechDeskVolunteerRunbooks() {
  const {user, roles} = await requireTechDeskStaff();

  return (
    <main className="section white">
      <div className="shell" style={{maxWidth: 1120}}>
        <div className="section-head">
          <div>
            <div className="eyebrow">Restricted volunteer operations</div>
            <h1>EFF Tech Desk Runbooks</h1>
            <p className="lead">
              Repeatable checks, safe actions, role boundaries, and escalation
              points for EFF technical-support volunteers.
            </p>
            <small>Signed in as {user.email} · {roles.join(", ").replaceAll("_", " ")}</small>
          </div>
          <BookOpenCheck/>
        </div>
        <div className="notice">
          <ShieldCheck/>
          <span>
            Volunteers may diagnose, communicate, and run approved read-only
            checks. Production code, deployments, data, roles, policies,
            environment values, domains, and ownership changes require an
            authorized administrator and an audit record.
          </span>
        </div>
        <div className="hero-actions" style={{marginBlock: 28}}>
          <Link className="button" href="/tech-desk/admin/lookup"><Search/> Look Up a Ticket or Account</Link>
          <Link className="button outline" href="/tech-desk/admin"><Wrench/> Command Center</Link>
          <Link className="button outline" href="/tech-desk/status">Public Status</Link>
        </div>
        <section className="tech-desk-knowledge">
          {techDeskVolunteerRunbooks.map((runbook) => (
            <details key={runbook.code}>
              <summary>{runbook.code} · {runbook.title}</summary>
              <p><strong>Applies to:</strong> {runbook.appliesTo}</p>
              <p><strong>Common symptoms</strong></p>
              <ul>{runbook.symptoms.map((item) => <li key={item}>{item}</li>)}</ul>
              <p><strong>Read-only checks</strong></p>
              <ol>{runbook.checks.map((item) => <li key={item}>{item}</li>)}</ol>
              <p><strong>Safe actions</strong></p>
              <ol>{runbook.safeActions.map((item) => <li key={item}>{item}</li>)}</ol>
              <div className="notice">
                <LockKeyhole/>
                <span>
                  <strong>{runbook.requiredRole} role.</strong> Escalate when: {runbook.escalateWhen}
                </span>
              </div>
            </details>
          ))}
        </section>
      </div>
    </main>
  );
}
