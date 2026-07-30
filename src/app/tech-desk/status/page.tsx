import type {Metadata} from "next";
import Link from "next/link";
import {Activity, AlertTriangle, CheckCircle2, Clock3} from "lucide-react";
import {createAdminClient} from "@/lib/supabase/admin";

export const metadata: Metadata = {title: "EFF Platform Status"};
export const dynamic = "force-dynamic";

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Awaiting first scheduled check";

export default async function TechDeskStatus() {
  const admin = createAdminClient();
  const {data: systems} = await admin
    .from("tech_desk_systems")
    .select("id,slug,name,base_url")
    .eq("active", true)
    .eq("public_status", true)
    .order("name");
  const ids = (systems ?? []).map((system) => system.id);
  const {data: checks} = ids.length
    ? await admin
        .from("tech_desk_health_checks")
        .select("system_id,status,http_status,latency_ms,detail_safe,checked_at")
        .in("system_id", ids)
        .order("checked_at", {ascending: false})
    : {data: []};
  const latest = new Map<string, NonNullable<typeof checks>[number]>();
  for (const check of checks ?? []) {
    if (!latest.has(check.system_id)) latest.set(check.system_id, check);
  }
  const attention = (systems ?? []).filter((system) => {
    const status = latest.get(system.id)?.status ?? "unknown";
    return status === "outage" || status === "degraded";
  }).length;

  return (
    <main className="section">
      <div className="shell">
        <div className="section-head">
          <div>
            <div className="eyebrow">Read-only public monitoring</div>
            <h1>EFF Platform Status</h1>
            <p className="lead">
              The Tech Desk checks official EFF websites without exposing
              provider credentials or private student records.
            </p>
          </div>
          <Activity/>
        </div>
        <div className="notice">
          {attention ? <AlertTriangle/> : <CheckCircle2/>}
          <span>
            <strong>
              {attention
                ? `${attention} platform${attention === 1 ? "" : "s"} need attention.`
                : "No confirmed public outages in the latest checks."}
            </strong>{" "}
            A successful page response does not guarantee that every
            account-specific feature is working.
          </span>
        </div>
        <section className="tech-desk-status-grid">
          {(systems ?? []).map((system) => {
            const check = latest.get(system.id);
            const status = check?.status ?? "unknown";
            return (
              <article className="tech-desk-status-card" key={system.id}>
                <header>
                  <h2>{system.name}</h2>
                  <span className="status">{status}</span>
                </header>
                <div className="tech-desk-health-line">
                  <span className={`tech-desk-health-dot ${status}`}/>
                  <strong>{status}</strong>
                  {check?.http_status && <span>HTTP {check.http_status}</span>}
                </div>
                <p>
                  {check?.detail_safe ||
                    "The first scheduled public check has not been recorded."}
                </p>
                <small>
                  <Clock3 size={14}/> {formatDate(check?.checked_at ?? null)}
                </small>
                <a href={system.base_url} target="_blank" rel="noreferrer">
                  Open official platform
                </a>
              </article>
            );
          })}
        </section>
        <div className="hero-actions">
          <Link className="button" href="/tech-desk/open-ticket">
            Report a Technical Problem
          </Link>
          <Link className="button outline" href="/tech-desk/knowledge">
            Review Safe Fixes
          </Link>
        </div>
      </div>
    </main>
  );
}
