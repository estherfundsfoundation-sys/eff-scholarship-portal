import "server-only";

import {classifyTechIssue, normalizeOfficialEffUrl, type TechDeskUrgency} from "@/lib/tech-desk";

type AdminClient = ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>;

export type TechDeskSystem = {
  id: string;
  slug: string;
  name: string;
  base_url: string;
  health_url: string;
  provider: string;
  vercel_project: string | null;
  github_repo: string | null;
  active: boolean;
};

export type SystemProbe = {
  status: "operational" | "degraded" | "outage" | "unknown";
  httpStatus: number | null;
  latencyMs: number | null;
  detailSafe: string;
  providerSafe: Record<string, unknown>;
};

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
      headers: {
        "user-agent": "EFF-Tech-Desk-Monitor/1.0",
        accept: "application/json,text/html;q=0.8,*/*;q=0.5",
        ...(init.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function publicHttpProbe(system: TechDeskSystem) {
  const target = normalizeOfficialEffUrl(system.health_url);
  if (!target) {
    return {
      status: "unknown",
      httpStatus: null,
      latencyMs: null,
      detailSafe: "Health URL is not an approved EFF HTTPS address.",
      providerSafe: {},
    } satisfies SystemProbe;
  }

  const started = Date.now();
  try {
    const response = await fetchWithTimeout(target);
    const latencyMs = Date.now() - started;
    let status: SystemProbe["status"] =
      response.status >= 500
        ? "outage"
        : response.status >= 400 || response.status === 429
          ? "degraded"
          : "operational";
    let detailSafe = `Public health request returned HTTP ${response.status}.`;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        const body = (await response.json()) as {
          status?: string;
          attentionRequired?: boolean;
          services?: Record<string, boolean>;
        };
        if (body.status === "degraded") status = "degraded";
        if (body.status === "operational" && response.ok) status = "operational";
        const unavailable = Object.entries(body.services ?? {})
          .filter(([, available]) => !available)
          .map(([name]) => name);
        detailSafe = unavailable.length
          ? `Public health endpoint reports attention needed for: ${unavailable.join(", ")}.`
          : `Public health endpoint reports ${body.status ?? "a successful response"}.`;
      } catch {
        // The HTTP result remains authoritative when a public response is not parseable JSON.
      }
    }
    return {
      status,
      httpStatus: response.status,
      latencyMs,
      detailSafe,
      providerSafe: {},
    } satisfies SystemProbe;
  } catch (error) {
    return {
      status: "outage",
      httpStatus: null,
      latencyMs: Date.now() - started,
      detailSafe:
        error instanceof Error && error.name === "AbortError"
          ? "Public health request timed out."
          : "Public health request could not connect.",
      providerSafe: {},
    } satisfies SystemProbe;
  }
}

async function githubProbe(repo: string | null) {
  if (!repo || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) return {};
  const token = process.env.GITHUB_MONITOR_TOKEN;
  try {
    const response = await fetchWithTimeout(
      `https://api.github.com/repos/${repo}/actions/runs?per_page=1`,
      {
        headers: token ? {authorization: `Bearer ${token}`} : {},
      },
      6000,
    );
    if (!response.ok) return {github: "unavailable", githubHttpStatus: response.status};
    const body = (await response.json()) as {
      workflow_runs?: Array<{
        status?: string;
        conclusion?: string | null;
        html_url?: string;
        created_at?: string;
      }>;
    };
    const latest = body.workflow_runs?.[0];
    return latest
      ? {
          github: "available",
          latestWorkflowStatus: latest.status ?? "unknown",
          latestWorkflowConclusion: latest.conclusion ?? "pending",
          latestWorkflowAt: latest.created_at ?? null,
        }
      : {github: "available", latestWorkflowStatus: "no_runs"};
  } catch {
    return {github: "unavailable"};
  }
}

async function vercelProbe(project: string | null) {
  const token = process.env.VERCEL_MONITOR_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!project || !token || !teamId) return {vercel: "not_configured"};
  try {
    const query = new URLSearchParams({
      projectId: project,
      teamId,
      limit: "1",
      target: "production",
    });
    const response = await fetchWithTimeout(
      `https://api.vercel.com/v6/deployments?${query}`,
      {headers: {authorization: `Bearer ${token}`}},
      6000,
    );
    if (!response.ok) return {vercel: "unavailable", vercelHttpStatus: response.status};
    const body = (await response.json()) as {
      deployments?: Array<{
        state?: string;
        readyState?: string;
        created?: number;
      }>;
    };
    const latest = body.deployments?.[0];
    return latest
      ? {
          vercel: "available",
          latestDeploymentState: latest.readyState ?? latest.state ?? "unknown",
          latestDeploymentAt: latest.created
            ? new Date(latest.created).toISOString()
            : null,
        }
      : {vercel: "available", latestDeploymentState: "none"};
  } catch {
    return {vercel: "unavailable"};
  }
}

export async function runTechSystemProbe(admin: AdminClient, system: TechDeskSystem) {
  const base = await publicHttpProbe(system);
  const [github, vercel] = await Promise.all([
    githubProbe(system.github_repo),
    vercelProbe(system.vercel_project),
  ]);
  const providerSafe = {...base.providerSafe, ...github, ...vercel};
  const {data} = await admin
    .from("tech_desk_health_checks")
    .insert({
      system_id: system.id,
      status: base.status,
      http_status: base.httpStatus,
      latency_ms: base.latencyMs,
      detail_safe: base.detailSafe,
      source: "scheduled_probe",
    })
    .select("id,status,http_status,latency_ms,detail_safe,checked_at")
    .single();
  return {...base, providerSafe, check: data};
}

export async function diagnoseTechTicket(
  admin: AdminClient,
  ticket: {
    id: string;
    product_slug: string;
    issue_category: string;
    description: string;
    error_message: string | null;
    urgency: TechDeskUrgency;
  },
) {
  const diagnosis = classifyTechIssue({
    category: ticket.issue_category,
    description: ticket.description,
    errorMessage: ticket.error_message,
    urgency: ticket.urgency,
  });
  const {data: system} = await admin
    .from("tech_desk_systems")
    .select(
      "id,slug,name,base_url,health_url,provider,vercel_project,github_repo,active",
    )
    .eq("slug", ticket.product_slug)
    .maybeSingle();

  const probe = system ? await runTechSystemProbe(admin, system as TechDeskSystem) : null;
  const systemOutage = probe?.status === "outage";
  const priority = systemOutage ? "P1" : diagnosis.priority;
  const requiresStaffReview = diagnosis.requiresStaffReview || systemOutage;
  const nextStatus = requiresStaffReview ? "staff_review" : "action_ready";
  const healthSnapshot = probe
    ? {
        status: probe.status,
        httpStatus: probe.httpStatus,
        latencyMs: probe.latencyMs,
        detail: probe.detailSafe,
        provider: probe.providerSafe,
        checkedAt: new Date().toISOString(),
      }
    : {};

  await admin
    .from("tech_desk_tickets")
    .update({
      status: nextStatus,
      priority,
      diagnosis_code: diagnosis.code,
      diagnosis_summary: diagnosis.summary,
      recommended_steps: diagnosis.steps,
      automation_confidence: diagnosis.confidence,
      health_snapshot: healthSnapshot,
      next_follow_up_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticket.id);

  await admin.from("tech_desk_messages").insert({
    ticket_id: ticket.id,
    author_type: "automation",
    author_name: "EFF Tech Desk",
    body: `${diagnosis.title}\n\n${diagnosis.summary}\n\n${diagnosis.steps
      .map((step, index) => `${index + 1}. ${step}`)
      .join("\n")}`,
  });
  await admin.from("tech_desk_events").insert({
    ticket_id: ticket.id,
    event_type: "automatic_diagnosis_completed",
    summary_safe: `Automatic diagnosis ${diagnosis.code} completed with ${Math.round(
      diagnosis.confidence * 100,
    )}% rule confidence.`,
    metadata_safe: {
      product: ticket.product_slug,
      health: probe?.status ?? "unknown",
      priority,
    },
  });

  if (requiresStaffReview) {
    await admin.from("tech_desk_remediation_jobs").insert({
      ticket_id: ticket.id,
      system_id: system?.id ?? null,
      action_type: diagnosis.proposedAction ?? "manual_technical_review",
      risk_level: diagnosis.code === "DEPLOYMENT_OUTAGE" ? "privileged" : "read_only",
      approval_required: true,
      request_summary: `${diagnosis.title}: ${diagnosis.summary}`,
      payload_safe: {
        diagnosisCode: diagnosis.code,
        publicHealth: probe?.status ?? "unknown",
      },
    });
  }

  return {diagnosis, probe, priority, nextStatus};
}
