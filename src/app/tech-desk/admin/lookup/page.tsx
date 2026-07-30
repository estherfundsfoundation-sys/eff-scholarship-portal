import type {Metadata} from "next";
import Link from "next/link";
import {AlertTriangle, Search, ShieldCheck, UserRoundSearch} from "lucide-react";
import {normalizeTechTicketNumber} from "@/lib/tech-desk";
import {requireTechDeskStaff} from "@/lib/tech-desk-server";
import {createAdminClient} from "@/lib/supabase/admin";

export const metadata: Metadata = {title: "Tech Desk Lookup"};
export const dynamic = "force-dynamic";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function TechDeskLookup({
  searchParams,
}: {
  searchParams: Promise<{q?: string}>;
}) {
  const {user, roles} = await requireTechDeskStaff();
  const raw = ((await searchParams).q ?? "").trim().slice(0, 180);
  const ticketCode = normalizeTechTicketNumber(raw);
  const email = emailPattern.test(raw) ? raw.toLowerCase() : "";
  const valid = Boolean(ticketCode || email);
  const admin = createAdminClient();

  const ticketQuery = ticketCode
    ? admin.from("tech_desk_tickets").select("*").eq("ticket_code", ticketCode).limit(20)
    : email
      ? admin.from("tech_desk_tickets").select("*").eq("email", email).order("created_at", {ascending: false}).limit(20)
      : null;
  const [{data: tickets}, {data: profile}, {data: legacy}, {data: reach}] =
    await Promise.all([
      ticketQuery ?? Promise.resolve({data: []}),
      email
        ? admin.from("profiles").select("id,legal_name,preferred_name,primary_email,created_at,updated_at").eq("primary_email", email).maybeSingle()
        : Promise.resolve({data: null}),
      email
        ? admin.from("legacy_application_records").select("id,source_system,status,application_id,claimed_by,original_submitted_at,updated_at").eq("email", email).order("updated_at", {ascending: false}).limit(20)
        : Promise.resolve({data: []}),
      email
        ? admin.from("reach_ambassadors").select("id,email,full_name,institution,user_id,active,invited_at,claimed_at,updated_at").eq("email", email).limit(10)
        : Promise.resolve({data: []}),
    ]);

  const {data: applications} = profile?.id
    ? await admin
        .from("applications")
        .select("id,status,source_system,source_record_id,submitted_at,updated_at,program_cycles(name,programs(name,slug))")
        .eq("applicant_id", profile.id)
        .order("updated_at", {ascending: false})
        .limit(30)
    : {data: []};

  return (
    <main className="section white">
      <div className="shell" style={{maxWidth: 1180}}>
        <div className="section-head">
          <div>
            <div className="eyebrow">Restricted exact-match diagnostics</div>
            <h1>Ticket and Account Lookup</h1>
            <p className="lead">
              Search one exact Tech Desk ticket number or verified email. This
              page is read-only and shows relationships needed for safe triage.
            </p>
            <small>Signed in as {user.email} · {roles.join(", ").replaceAll("_", " ")}</small>
          </div>
          <UserRoundSearch/>
        </div>
        <div className="notice">
          <ShieldCheck/>
          <span>
            Never paste passwords, codes, private keys, Social Security numbers,
            bank details, or document contents. Search only an exact EFF-TECH
            ticket number or verified email.
          </span>
        </div>
        <form method="get" className="card" style={{marginBlock: 28}}>
          <label>
            Exact ticket number or verified email
            <span className="two">
              <input name="q" required defaultValue={raw} placeholder="EFF-TECH-2026-AB12CD34 or student@example.edu"/>
              <button className="button"><Search/> Look Up</button>
            </span>
          </label>
        </form>
        {raw && !valid && (
          <div className="notice"><AlertTriangle/><span>Use a complete EFF-TECH ticket number or one exact email address.</span></div>
        )}
        {valid && (
          <div className="stack">
            <section className="card">
              <h2>Tech Desk tickets ({tickets?.length ?? 0})</h2>
              {(tickets ?? []).map((ticket) => (
                <details key={ticket.id}>
                  <summary>{ticket.ticket_code} · {ticket.status.replaceAll("_", " ")} · {ticket.priority}</summary>
                  <p><strong>{ticket.subject}</strong></p>
                  <p>{ticket.product_slug} · {ticket.issue_category.replaceAll("_", " ")}</p>
                  <p>{ticket.diagnosis_code?.replaceAll("_", " ") || "Awaiting diagnosis"}</p>
                  <p className="muted">Updated {new Date(ticket.updated_at).toLocaleString("en-US")}</p>
                </details>
              ))}
              {!tickets?.length && <p className="muted">No Tech Desk ticket matched.</p>}
            </section>
            {email && (
              <>
                <section className="card">
                  <h2>Verified portal profile</h2>
                  {profile ? (
                    <>
                      <p><strong>{profile.preferred_name || profile.legal_name || "Unnamed profile"}</strong></p>
                      <p>{profile.primary_email}</p>
                      <p className="muted">Profile {profile.id} · Updated {new Date(profile.updated_at).toLocaleString("en-US")}</p>
                    </>
                  ) : <p className="muted">No Student Portal profile matched this exact email.</p>}
                </section>
                <section className="card">
                  <h2>Scholarship and support applications ({applications?.length ?? 0})</h2>
                  {(applications ?? []).map((application) => (
                    <details key={application.id}>
                      <summary>{application.status.replaceAll("_", " ")} · {application.id}</summary>
                      <p>Source: {application.source_system || "portal"}</p>
                      <p>Submitted: {application.submitted_at ? new Date(application.submitted_at).toLocaleString("en-US") : "Not submitted"}</p>
                      <p className="muted">Updated {new Date(application.updated_at).toLocaleString("en-US")}</p>
                    </details>
                  ))}
                  {!applications?.length && <p className="muted">No application is owned by the matching portal profile.</p>}
                </section>
                <section className="card">
                  <h2>Imported application records ({legacy?.length ?? 0})</h2>
                  {(legacy ?? []).map((record) => (
                    <details key={record.id}>
                      <summary>{record.status} · {record.source_system}</summary>
                      <p>Application: {record.application_id || "Not connected"}</p>
                      <p>Claimed profile: {record.claimed_by || "Not claimed"}</p>
                      <p className="muted">Updated {new Date(record.updated_at).toLocaleString("en-US")}</p>
                    </details>
                  ))}
                  {!legacy?.length && <p className="muted">No imported application record matched this exact email.</p>}
                </section>
                <section className="card">
                  <h2>REACH ambassador records ({reach?.length ?? 0})</h2>
                  {(reach ?? []).map((record) => (
                    <details key={record.id}>
                      <summary>{record.full_name || record.email} · {record.claimed_at ? "claimed" : "unclaimed"}</summary>
                      <p>{record.institution || "Institution not recorded"}</p>
                      <p>Connected profile: {record.user_id || "Not connected"}</p>
                      <p>Invited: {record.invited_at ? new Date(record.invited_at).toLocaleString("en-US") : "Not recorded"}</p>
                    </details>
                  ))}
                  {!reach?.length && <p className="muted">No REACH ambassador record matched this exact email.</p>}
                </section>
              </>
            )}
            <div className="notice">
              <AlertTriangle/>
              <span>
                Read-only evidence is not permission to change ownership. Use the
                approved runbook and escalate any data, role, policy, or record
                relationship change to an authorized administrator.
              </span>
            </div>
          </div>
        )}
        <div className="hero-actions" style={{marginTop: 28}}>
          <Link className="button outline" href="/tech-desk/admin/runbooks">Open Volunteer Runbooks</Link>
          <Link className="button outline" href="/tech-desk/admin">Return to Command Center</Link>
        </div>
      </div>
    </main>
  );
}
