import "server-only";
import { createAdminClient } from "../supabase/admin";
import { shouldArchiveScholarshipLink } from "./link-health-rules";

const RETRY_WITH_GET = new Set([403, 405, 429]);

async function checkLink(url: string) {
  const headers = {
    "User-Agent":
      "EFFScholarshipDirectory/1.0 (+mailto:notifications@estherfundsinc.org)",
    Accept: "text/html,application/xhtml+xml",
  };

  try {
    let response = await fetch(url, {
      method: "HEAD",
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });

    if (RETRY_WITH_GET.has(response.status)) {
      response = await fetch(url, {
        method: "GET",
        headers: { ...headers, Range: "bytes=0-4096" },
        redirect: "follow",
        signal: AbortSignal.timeout(12_000),
        cache: "no-store",
      });
    }

    return {
      status: response.status,
      finalUrl: response.url || url,
      reachable: response.ok,
      error: null,
    };
  } catch (error) {
    return {
      status: null,
      finalUrl: url,
      reachable: false,
      error: error instanceof Error ? error.message : "Link check failed",
    };
  }
}

export async function verifyLiveScholarshipLinks() {
  const db = createAdminClient();
  const { data, error } = await db
    .from("external_scholarships")
    .select("id,original_url")
    .not("published_at", "is", null)
    .is("archived_at", null);

  if (error) throw error;

  const results: Array<{
    id: string;
    status: number | null;
    finalUrl: string;
    reachable: boolean;
    error: string | null;
  }> = [];
  const concurrency = 12;

  for (let index = 0; index < (data ?? []).length; index += concurrency) {
    const batch = (data ?? []).slice(index, index + concurrency);
    results.push(
      ...(await Promise.all(
        batch.map(async (item) => ({
          id: item.id,
          ...(await checkLink(item.original_url)),
        })),
      )),
    );
  }

  const brokenIds = results
    .filter((item) => shouldArchiveScholarshipLink(item.status))
    .map((item) => item.id);

  if (brokenIds.length) {
    const { error: archiveError } = await db
      .from("external_scholarships")
      .update({ archived_at: new Date().toISOString() })
      .in("id", brokenIds);
    if (archiveError) throw archiveError;
  }

  return {
    checked: results.length,
    reachable: results.filter((item) => item.reachable).length,
    blockedOrTimedOut: results.filter(
      (item) =>
        !item.reachable && !shouldArchiveScholarshipLink(item.status),
    ).length,
    archivedBroken: brokenIds.length,
  };
}
