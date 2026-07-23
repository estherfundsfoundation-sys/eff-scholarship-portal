import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const envFile = path.join(root, ".env.local");

for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!match || process.env[match[1]]) continue;
  let value = match[2].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  process.env[match[1]] = value;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const portalUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://portal.estherfundsfoundation.org";

const timeoutMs = 15_000;

function decodeHtml(value) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadFromDatabase() {
  if (!supabaseUrl || !serviceRoleKey) return null;
  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db
    .from("external_scholarships")
    .select(
      "id,slug,title,sponsor,deadline_kind,deadline,original_url,canonical_url,published_at,archived_at,updated_at",
    )
    .not("published_at", "is", null)
    .is("archived_at", null)
    .order("deadline", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

async function loadFromPortal() {
  const detailLinks = new Set();
  let totalPages = 1;

  for (let page = 1; page <= totalPages; page += 1) {
    const listing = await fetch(`${portalUrl}/scholarships?page=${page}`, {
      headers: {
        "User-Agent":
          "EFFScholarshipDirectoryAudit/1.0 (+mailto:notifications@estherfundsinc.org)",
      },
    });
    if (!listing.ok) {
      throw new Error(`Directory page ${page} returned HTTP ${listing.status}.`);
    }
    const html = await listing.text();
    const pageMatch = decodeHtml(html).match(/Page\s+\d+\s+of\s+(\d+)/i);
    if (pageMatch) totalPages = Number(pageMatch[1]);
    for (const match of html.matchAll(
      /href=["'](\/scholarships\/(?!saved)([^"'?#]+))["']/gi,
    )) {
      detailLinks.add(new URL(match[1], portalUrl).toString());
    }
  }

  const rows = [];
  const links = [...detailLinks];
  const concurrency = 8;

  for (let index = 0; index < links.length; index += concurrency) {
    const batch = links.slice(index, index + concurrency);
    rows.push(
      ...(
        await Promise.all(
          batch.map(async (detailUrl) => {
            const response = await fetch(detailUrl, {
              headers: {
                "User-Agent":
                  "EFFScholarshipDirectoryAudit/1.0 (+mailto:notifications@estherfundsinc.org)",
              },
            });
            const html = await response.text();
            const title =
              decodeHtml(html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1] ?? "") ||
              detailUrl;
            const applyMatch = html.match(
              /<a[^>]+href=["']([^"']+)["'][^>]*>\s*Apply on provider website/i,
            );
            return {
              id: detailUrl,
              slug: new URL(detailUrl).pathname.split("/").pop(),
              title,
              original_url: applyMatch
                ? decodeHtml(applyMatch[1])
                : detailUrl,
              detailUrl,
              detailStatus: response.status,
            };
          }),
        )
      ),
    );
  }

  return rows;
}

const scholarships = (await loadFromDatabase()) ?? (await loadFromPortal());

function suspiciousDestination(item, finalUrl) {
  const original = new URL(item.original_url);
  const final = new URL(finalUrl);
  const genericPaths = new Set(["/", "/home", "/index", "/scholarships"]);
  return (
    genericPaths.has(final.pathname.replace(/\/$/, "") || "/") &&
    !genericPaths.has(original.pathname.replace(/\/$/, "") || "/")
  );
}

async function inspect(item) {
  let response;
  let method = "HEAD";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    response = await fetch(item.original_url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "EFFScholarshipDirectoryAudit/1.0 (+mailto:notifications@estherfundsinc.org)",
      },
    });

    if ([403, 405, 429].includes(response.status)) {
      method = "GET";
      response = await fetch(item.original_url, {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "EFFScholarshipDirectoryAudit/1.0 (+mailto:notifications@estherfundsinc.org)",
          Range: "bytes=0-4096",
        },
      });
    }

    return {
      id: item.id,
      slug: item.slug,
      title: item.title,
      originalUrl: item.original_url,
      status: response.status,
      ok: response.ok,
      method,
      finalUrl: response.url || item.original_url,
      redirected: (response.url || item.original_url) !== item.original_url,
      suspiciousDestination: suspiciousDestination(
        item,
        response.url || item.original_url,
      ),
      error: null,
    };
  } catch (auditError) {
    return {
      id: item.id,
      slug: item.slug,
      title: item.title,
      originalUrl: item.original_url,
      status: null,
      ok: false,
      method,
      finalUrl: null,
      redirected: false,
      suspiciousDestination: false,
      error:
        auditError instanceof Error ? auditError.message : "Unknown audit error",
    };
  } finally {
    clearTimeout(timeout);
  }
}

const results = [];
const concurrency = 8;

for (let index = 0; index < scholarships.length; index += concurrency) {
  const batch = scholarships.slice(index, index + concurrency);
  results.push(...(await Promise.all(batch.map(inspect))));
  process.stdout.write(
    `Checked ${Math.min(index + concurrency, scholarships.length)}/${scholarships.length}\r`,
  );
}

const failures = results.filter((item) => !item.ok);
const suspicious = results.filter((item) => item.suspiciousDestination);
const redirects = results.filter((item) => item.redirected);
const duplicateDestinations = Object.entries(
  results.reduce((groups, item) => {
    const key = item.finalUrl ?? item.originalUrl;
    groups[key] ??= [];
    groups[key].push({ id: item.id, slug: item.slug, title: item.title });
    return groups;
  }, {}),
)
  .filter(([, items]) => items.length > 1)
  .map(([url, items]) => ({ url, items }));

const report = {
  generatedAt: new Date().toISOString(),
  total: results.length,
  passing: results.length - failures.length,
  failures: failures.length,
  redirects: redirects.length,
  suspiciousDestinations: suspicious.length,
  duplicateDestinations: duplicateDestinations.length,
  results,
  failuresDetail: failures,
  suspiciousDetail: suspicious,
  duplicateDestinationDetail: duplicateDestinations,
};

const outputDir = path.join(root, "tmp");
fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, "scholarship-link-audit.json");
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

process.stdout.write("\n");
console.log(
  JSON.stringify(
    {
      outputPath,
      total: report.total,
      passing: report.passing,
      failures: report.failures,
      redirects: report.redirects,
      suspiciousDestinations: report.suspiciousDestinations,
      duplicateDestinations: report.duplicateDestinations,
    },
    null,
    2,
  ),
);
