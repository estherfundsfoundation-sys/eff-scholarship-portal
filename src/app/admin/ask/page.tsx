import Link from "next/link";
import {BookOpenCheck, Brain, CircleAlert, Gauge, ShieldCheck} from "lucide-react";
import {requireAdmin} from "@/lib/auth/staff";
import {createAdminClient} from "@/lib/supabase/admin";
import {createKnowledgeDraft, publishKnowledgeRecord, retireKnowledgeRecord, updateRuntimeSettings} from "./actions";
import styles from "./admin-ask.module.css";

export default async function AskEffAdminPage() {
  await requireAdmin();
  const supabase = createAdminClient();
  const [recordsResult, gapsResult, feedbackResult, usageResult, settingsResult, sourcesResult] = await Promise.all([
    supabase.from("ask_eff_knowledge_records").select("id,category,organization,topic,approved_answer,visibility,publication_status,source_reference,version,created_at").order("created_at", {ascending: false}).limit(30),
    supabase.from("ask_eff_knowledge_gaps").select("id", {count: "exact", head: true}).eq("status", "open"),
    supabase.from("ask_eff_feedback").select("id", {count: "exact", head: true}).eq("status", "new"),
    supabase.from("ask_eff_usage_daily").select("request_count,reserved_cost_micros").eq("usage_day", new Date().toISOString().slice(0, 10)),
    supabase.from("ask_eff_runtime_settings").select("generation_enabled,web_search_enabled,requests_per_user_per_day,daily_budget_usd,updated_at").eq("id", 1).maybeSingle(),
    supabase.from("ask_eff_source_catalog").select("source_key,title,source_kind,canonical_url,authority_level,coverage_status,last_reviewed_on,review_due_on,notes").order("title").limit(100),
  ]);
  const schemaReady = !recordsResult.error;
  const records = recordsResult.data ?? [];
  const usage = (usageResult.data ?? []).reduce((sum, row) => ({requests: sum.requests + Number(row.request_count), micros: sum.micros + Number(row.reserved_cost_micros)}), {requests: 0, micros: 0});
  const settings = settingsResult.data;
  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.header}><div><Link href="/admin">← Command center</Link><p>ASK EFF · NATIONALS</p><h1>Knowledge Center</h1><span>Teach Ask EFF through reviewed records—not automatic policy changes.</span></div><div className={styles.status}><ShieldCheck/><strong>{schemaReady ? "Isolated knowledge store connected" : "Migration not applied"}</strong><span>Public chat receives published, public records only.</span></div></header>
    {!schemaReady ? <div className={styles.warning}><CircleAlert/><div><strong>Ask EFF database setup is pending.</strong><p>Apply the new additive Ask EFF migration in development or staging before using this screen. No existing portal table needs to change.</p></div></div> : null}
    <section className={styles.formPanel}><p className={styles.eyebrow}>PILOT CONTROLS</p><h2>Runtime limits</h2><p>The environment feature flag remains the master kill switch. These server-side settings let authorized Nationals administrators pause generation, control external research, and cap pilot use.</p><form action={updateRuntimeSettings} className={styles.form}>
      <label>Generation<select name="generationEnabled" defaultValue={settings?.generation_enabled === false ? "off" : "on"}><option value="on">On</option><option value="off">Paused</option></select></label>
      <label>External web research<select name="webSearchEnabled" defaultValue={settings?.web_search_enabled ? "on" : "off"}><option value="off">Off</option><option value="on">On</option></select></label>
      <label>Daily messages per user<input name="requestsPerUserPerDay" type="number" min="1" max="100" defaultValue={settings?.requests_per_user_per_day ?? 10}/></label>
      <label>Daily budget (USD)<input name="dailyBudgetUsd" type="number" min="0.10" max="10000" step="0.10" defaultValue={Number(settings?.daily_budget_usd ?? 5)}/></label>
      <button type="submit" disabled={!schemaReady}>Save pilot controls</button>
    </form></section>
    <section className={styles.stats}><article><Brain/><strong>{records.length}</strong><span>recent records</span></article><article><BookOpenCheck/><strong>{sourcesResult.data?.length ?? 0}</strong><span>curated sources</span></article><article><CircleAlert/><strong>{gapsResult.count ?? 0}</strong><span>open knowledge gaps</span></article><article><BookOpenCheck/><strong>{feedbackResult.count ?? 0}</strong><span>accuracy reports</span></article><article><Gauge/><strong>{usage.requests}</strong><span>requests today · ${(usage.micros / 1_000_000).toFixed(2)} reserved</span></article></section>
    <section className={styles.formPanel}><p className={styles.eyebrow}>KNOWLEDGE COVERAGE</p><h2>Approved source inventory</h2><p>Ask EFF uses reviewed public sources and founder-approved records. Social posts remain historical evidence—not current policy—until Nationals reviews and publishes the extracted facts.</p><div className={styles.records}>{(sourcesResult.data ?? []).map((source) => <article key={source.source_key}><div className={styles.recordMeta}><span>{source.source_kind.replaceAll("_", " ")}</span><span>{source.authority_level.replaceAll("_", " ")}</span><span>{source.coverage_status.replaceAll("_", " ")}</span></div><h3>{source.title}</h3><p>{source.notes}</p>{source.canonical_url ? <a href={source.canonical_url} target="_blank" rel="noopener noreferrer">Open source ↗</a> : null}<small>Reviewed {source.last_reviewed_on ?? "not yet"} · Review due {source.review_due_on ?? "not scheduled"}</small></article>)}</div></section>
    <section className={styles.grid}><div className={styles.formPanel}><p className={styles.eyebrow}>TEACH ASK EFF</p><h2>Create a reviewable draft</h2><p>Enter the founder-approved lesson in a structured form. It remains a draft until an authorized administrator publishes it.</p><form action={createKnowledgeDraft} className={styles.form}>
      <label>Knowledge type<select name="category" required defaultValue="policy"><option value="official_fact">Official fact</option><option value="current_status">Current status</option><option value="policy">Policy</option><option value="procedure">Procedure</option><option value="public_role">Public role/contact</option><option value="response_example">Response example</option><option value="voice_value">Voice/value</option></select></label>
      <label>Organization<input name="organization" required defaultValue="Esther Funds Foundation"/></label>
      <label>Topic<input name="topic" required placeholder="Example: Starting an EFF chapter"/></label>
      <label>Question or trigger<input name="triggerQuestion" placeholder="When someone asks…"/></label>
      <label>What we need to know<textarea name="informationNeeded" rows={3} placeholder="Only the minimum facts needed to answer safely."/></label>
      <label>Applicable approved policy<textarea name="applicablePolicy" rows={3}/></label>
      <label className={styles.full}>Approved explanation<textarea name="explanation" required rows={6} placeholder="Explain the approved fact, policy, procedure, or response."/></label>
      <label>Required next action<textarea name="requiredAction" rows={3}/></label>
      <label>When to escalate<textarea name="escalationRule" rows={3}/></label>
      <label>What Ask EFF must not promise<textarea name="prohibitedAlternatives" rows={3}/></label>
      <label>Canonical link<input name="canonicalUrl" type="url" placeholder="https://"/></label>
      <label>Source/reference<input name="sourceReference" required placeholder="Board policy, approved handbook, founder directive…"/></label>
      <label>Visibility<select name="visibility" defaultValue="public"><option value="public">Public</option><option value="restricted_chapter">Restricted chapter — disabled in MVP</option><option value="restricted_national">Restricted national — disabled in MVP</option></select></label>
      <button type="submit" disabled={!schemaReady}>Save review draft</button>
    </form></div>
    <div className={styles.records}><div className={styles.recordsHead}><div><p className={styles.eyebrow}>REVIEW QUEUE</p><h2>Knowledge records</h2></div><span>{records.filter((record) => record.publication_status === "draft").length} drafts</span></div>
      {records.length ? records.map((record) => <article key={record.id}><div className={styles.recordMeta}><span>{record.category.replaceAll("_", " ")}</span><span>{record.organization}</span><span>{record.visibility}</span><span>v{record.version}</span></div><h3>{record.topic}</h3><p>{record.approved_answer}</p><small>Source: {record.source_reference}</small><div className={styles.actions}>{record.publication_status === "draft" ? <form action={publishKnowledgeRecord}><input type="hidden" name="id" value={record.id}/><button>Publish approved record</button></form> : <span className={styles.published}>{record.publication_status}</span>} {record.publication_status !== "retired" ? <form action={retireKnowledgeRecord}><input type="hidden" name="id" value={record.id}/><button className={styles.retire}>Retire</button></form> : null}</div></article>) : <div className={styles.empty}>No Ask EFF knowledge records yet.</div>}
    </div></section>
  </div></main>;
}
