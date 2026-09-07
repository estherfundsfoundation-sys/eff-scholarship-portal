import "server-only";
import {createAdminClient} from "@/lib/supabase/admin";
import {ownerApprovedPrograms, type AskEffProgram} from "./program-registry";
import type {EvidenceSource} from "./schema";

export type ApprovedKnowledge = {
  id: string;
  category: "official_fact" | "current_status" | "policy" | "procedure" | "public_role" | "response_example" | "voice_value";
  organization: string;
  topic: string;
  informationNeeded: string | null;
  applicablePolicy: string | null;
  approvedAnswer: string;
  requiredAction: string | null;
  escalationRule: string | null;
  prohibitedAlternatives: string | null;
  canonicalUrl: string | null;
  visibility: "public";
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  version: number;
  sourceReference: string;
};

const STOP_WORDS = new Set(["a","an","and","are","as","at","be","can","do","for","from","how","i","in","is","it","me","my","of","on","or","the","to","us","we","what","when","where","who","with","you","your"]);

function searchTokens(value: string) {
  return [...new Set(value.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((token) => token.length > 2 && !STOP_WORDS.has(token)))];
}

function knowledgeScore(record: ApprovedKnowledge, query: string) {
  const haystack = `${record.organization} ${record.topic} ${record.informationNeeded ?? ""} ${record.applicablePolicy ?? ""} ${record.approvedAnswer} ${record.requiredAction ?? ""}`.toLowerCase();
  const tokens = searchTokens(query);
  return tokens.reduce((score, token) => score + (haystack.includes(token) ? (record.topic.toLowerCase().includes(token) ? 5 : 2) : 0), 0);
}

export async function loadApprovedPublicKnowledge(query: string, limit = 8): Promise<ApprovedKnowledge[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  const admin = createAdminClient();
  const now = Date.now();
  const {data, error} = await admin
    .from("ask_eff_knowledge_records")
    .select("id,category,organization,topic,information_needed,applicable_policy,approved_answer,required_action,escalation_rule,prohibited_alternatives,canonical_url,visibility,effective_from,effective_until,version,source_reference")
    .eq("publication_status", "published")
    .eq("visibility", "public")
    .order("version", {ascending: false})
    .limit(250);
  if (error) return [];
  const current = (data ?? []).map((row) => ({
    id: String(row.id),
    category: row.category,
    organization: row.organization,
    topic: row.topic,
    informationNeeded: row.information_needed,
    applicablePolicy: row.applicable_policy,
    approvedAnswer: row.approved_answer,
    requiredAction: row.required_action,
    escalationRule: row.escalation_rule,
    prohibitedAlternatives: row.prohibited_alternatives,
    canonicalUrl: row.canonical_url,
    visibility: "public" as const,
    effectiveFrom: row.effective_from,
    effectiveUntil: row.effective_until,
    version: row.version,
    sourceReference: row.source_reference,
  })).filter((record) => (!record.effectiveFrom || Date.parse(record.effectiveFrom) <= now) && (!record.effectiveUntil || Date.parse(record.effectiveUntil) > now));
  const newestByTopic = new Map<string, ApprovedKnowledge>();
  for (const record of current) {
    const key = `${record.organization.toLowerCase()}::${record.topic.toLowerCase()}`;
    if (!newestByTopic.has(key)) newestByTopic.set(key, record);
  }
  const ranked = [...newestByTopic.values()].map((record) => ({record, score: knowledgeScore(record, query)})).sort((left, right) => right.score - left.score || right.record.version - left.record.version);
  const matches = ranked.filter((item) => item.score > 0).slice(0, Math.min(12, Math.max(1, limit))).map((item) => item.record);
  return matches.length ? matches : ranked.filter((item) => ["mission", "student resources", "contact nationals"].includes(item.record.topic.toLowerCase())).slice(0, 3).map((item) => item.record);
}

export function knowledgeSources(records: ApprovedKnowledge[], startAt = 1, accessedAt = new Date().toISOString()): EvidenceSource[] {
  return records.flatMap((record, index) => record.canonicalUrl ? [{
    id: `EFF${startAt + index}`,
    title: `${record.organization}: ${record.topic}`,
    url: record.canonicalUrl,
    sourceType: "eff_resource" as const,
    accessedAt,
  }] : []);
}

export async function loadApprovedProgramOverrides(programs: AskEffProgram[]) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return programs;
  const admin = createAdminClient();
  const {data, error} = await admin
    .from("ask_eff_program_registry")
    .select("program_id,official_name,description,audience,canonical_url,contact,eligibility_summary,cost_description,status,approval_status,source_reference,version")
    .eq("approval_status", "approved")
    .order("version", {ascending: true})
    .limit(50);
  if (error || !data) return programs;
  const overrides = new Map(data.map((row) => [row.program_id, row]));
  return programs.map((program) => {
    const row = overrides.get(program.programId);
    if (!row) return program;
    return {
      ...program,
      officialName: row.official_name,
      description: row.description,
      audience: row.audience,
      canonicalUrl: row.canonical_url,
      contact: row.contact ?? undefined,
      eligibilitySummary: row.eligibility_summary,
      costDescription: row.cost_description,
      status: row.status,
      sourceReference: row.source_reference,
      version: row.version,
    };
  });
}

export async function findApprovedChapter(institution: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return {status: "unavailable" as const};
  const admin = createAdminClient();
  const term = institution.replace(/[%_,]/g, " ").trim().slice(0, 120);
  const {data, error} = await admin
    .from("ask_eff_public_chapters")
    .select("institution_name,organization,chapter_type,operational_status,public_contact,canonical_url,reviewed_at")
    .eq("publication_status", "published")
    .ilike("institution_name", `%${term}%`)
    .limit(5);
  if (error) return {status: "unavailable" as const};
  if (!data?.length) return {status: "unknown" as const};
  return {status: "found" as const, chapters: data};
}

export async function findApprovedPublicContact(query: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return {status: "unavailable" as const};
  const admin = createAdminClient();
  const term = query.replace(/[%_,]/g, " ").trim().slice(0, 120);
  const today = new Date().toISOString().slice(0, 10);
  const {data, error} = await admin
    .from("ask_eff_public_contacts")
    .select("display_name,official_role,organization,organizational_contact,public_biography,role_started_on,role_ended_on,reviewed_at")
    .eq("publication_status", "published")
    .eq("publication_permission", true)
    .or(`role_started_on.is.null,role_started_on.lte.${today}`)
    .or(`role_ended_on.is.null,role_ended_on.gte.${today}`)
    .or(`official_role.ilike.%${term}%,organization.ilike.%${term}%,display_name.ilike.%${term}%`)
    .limit(5);
  if (error) return {status: "unavailable" as const};
  if (!data?.length) return {status: "unknown" as const};
  return {status: "found" as const, contacts: data};
}

export async function loadAskEffRuntimeSettings() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const admin = createAdminClient();
  const {data, error} = await admin.from("ask_eff_runtime_settings").select("generation_enabled,web_search_enabled,requests_per_user_per_day,daily_budget_usd").eq("id", 1).maybeSingle();
  if (error || !data) return null;
  return {
    generationEnabled: data.generation_enabled === true,
    webSearchEnabled: data.web_search_enabled === true,
    requestsPerUserPerDay: Number(data.requests_per_user_per_day),
    dailyBudgetUsd: Number(data.daily_budget_usd),
  };
}

export {ownerApprovedPrograms};
