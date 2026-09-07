import "server-only";
import {createHmac, timingSafeEqual} from "node:crypto";
import {createAdminClient} from "@/lib/supabase/admin";
import {getAskEffConfig} from "./config";

export function verifyPilotCode(received: string) {
  const expected = getAskEffConfig().pilotAccessCode;
  if (!expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function hashAskEffSubject(subject: string) {
  const secret = getAskEffConfig().rateLimitSecret;
  if (!secret) throw new Error("Ask EFF rate-limit secret is not configured");
  return createHmac("sha256", secret).update(subject).digest("hex");
}

export async function reserveAskEffBudget(subjectHash: string, requestId: string, limits?: {requestsPerUserPerDay: number; dailyBudgetUsd: number}) {
  const config = getAskEffConfig();
  if (config.mockMode) return {allowed: true, reason: "mock_mode"};
  const admin = createAdminClient();
  const {data, error} = await admin.rpc("reserve_ask_eff_usage", {
    p_subject_hash: subjectHash,
    p_request_id: requestId,
    p_estimated_cost_micros: Math.round(config.estimatedRequestCostUsd * 1_000_000),
    p_max_requests: limits?.requestsPerUserPerDay ?? config.requestsPerUserPerDay,
    p_daily_budget_micros: Math.round((limits?.dailyBudgetUsd ?? config.dailyBudgetUsd) * 1_000_000),
  });
  if (error) throw new Error("Ask EFF usage accounting is unavailable");
  const result = data as {allowed?: boolean; reason?: string} | null;
  return {allowed: result?.allowed === true, reason: result?.reason ?? "unavailable"};
}
