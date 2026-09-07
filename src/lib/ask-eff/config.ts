import "server-only";

function bool(name: string, fallback = false) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
}

function number(name: string, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

export function getAskEffConfig() {
  const production = process.env.NODE_ENV === "production";
  return {
    enabled: bool("ASK_EFF_ENABLED", false),
    webSearchEnabled: bool("ASK_EFF_WEB_SEARCH_ENABLED", false),
    savedHistoryEnabled: bool("ASK_EFF_SAVED_HISTORY_ENABLED", false),
    pilotOnly: bool("ASK_EFF_PILOT_ONLY", true),
    pilotAccessCode: process.env.ASK_EFF_PILOT_ACCESS_CODE ?? "",
    mockMode: !production && bool("ASK_EFF_MOCK_MODE", false),
    model: process.env.ASK_EFF_MODEL ?? "gpt-5.6-luna",
    moderationModel: process.env.ASK_EFF_MODERATION_MODEL ?? "omni-moderation-latest",
    requestsPerUserPerDay: number("ASK_EFF_REQUESTS_PER_USER_PER_DAY", 10, 1, 100),
    dailyBudgetUsd: number("ASK_EFF_DAILY_BUDGET_USD", 5, 0.1, 10_000),
    estimatedRequestCostUsd: number("ASK_EFF_ESTIMATED_REQUEST_COST_USD", 0.04, 0.001, 100),
    maxInputCharacters: number("ASK_EFF_MAX_INPUT_CHARACTERS", 5_000, 500, 20_000),
    maxOutputTokens: number("ASK_EFF_MAX_OUTPUT_TOKENS", 900, 200, 4_000),
    maxMessages: number("ASK_EFF_MAX_MESSAGES", 16, 2, 40),
    temporaryRetentionMinutes: number("ASK_EFF_TEMPORARY_RETENTION_MINUTES", 60, 5, 1_440),
    rateLimitSecret: process.env.ASK_EFF_RATE_LIMIT_SECRET ?? process.env.CRON_SECRET ?? "",
    openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  };
}

export function isAskEffEnabled() {
  return getAskEffConfig().enabled;
}

