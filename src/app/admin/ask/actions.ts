"use server";

import {revalidatePath} from "next/cache";
import {z} from "zod";
import {requireAdmin} from "@/lib/auth/staff";
import {createAdminClient} from "@/lib/supabase/admin";

const draftSchema = z.object({
  category: z.enum(["official_fact","current_status","policy","procedure","public_role","response_example","voice_value"]),
  organization: z.string().trim().min(2).max(100),
  topic: z.string().trim().min(3).max(180),
  triggerQuestion: z.string().trim().max(500).optional(),
  informationNeeded: z.string().trim().max(2_000).optional(),
  applicablePolicy: z.string().trim().max(2_000).optional(),
  explanation: z.string().trim().min(10).max(8_000),
  requiredAction: z.string().trim().max(2_000).optional(),
  escalationRule: z.string().trim().max(2_000).optional(),
  canonicalUrl: z.union([z.literal(""), z.string().url()]).optional(),
  prohibitedAlternatives: z.string().trim().max(2_000).optional(),
  sourceReference: z.string().trim().min(3).max(500),
  visibility: z.enum(["public","restricted_chapter","restricted_national"]),
});

export async function createKnowledgeDraft(formData: FormData) {
  const {user} = await requireAdmin();
  const supabase = createAdminClient();
  const parsed = draftSchema.safeParse({
    category: formData.get("category"), organization: formData.get("organization"), topic: formData.get("topic"),
    triggerQuestion: formData.get("triggerQuestion"), informationNeeded: formData.get("informationNeeded"), applicablePolicy: formData.get("applicablePolicy"), explanation: formData.get("explanation"), requiredAction: formData.get("requiredAction"), escalationRule: formData.get("escalationRule"),
    canonicalUrl: formData.get("canonicalUrl"), prohibitedAlternatives: formData.get("prohibitedAlternatives"), sourceReference: formData.get("sourceReference"), visibility: formData.get("visibility"),
  });
  if (!parsed.success) throw new Error("The draft is missing required information.");
  const value = parsed.data;
  const {data, error} = await supabase.from("ask_eff_knowledge_records").insert({
    category: value.category, organization: value.organization, topic: value.topic, trigger_question: value.triggerQuestion || null,
    information_needed: value.informationNeeded || null, applicable_policy: value.applicablePolicy || null,
    approved_answer: value.explanation, required_action: value.requiredAction || null, escalation_rule: value.escalationRule || null, canonical_url: value.canonicalUrl || null,
    prohibited_alternatives: value.prohibitedAlternatives || null, source_reference: value.sourceReference, visibility: value.visibility,
    publication_status: "draft", created_by: user.id,
  }).select("id").single();
  if (error) throw new Error("The Ask EFF draft could not be created.");
  await supabase.from("ask_eff_admin_audit").insert({actor_id: user.id, action: "knowledge_draft_created", record_type: "knowledge_record", record_id: data.id, safe_metadata: {category: value.category, organization: value.organization}});
  revalidatePath("/admin/ask");
}

const recordIdSchema = z.string().uuid();

export async function publishKnowledgeRecord(formData: FormData) {
  const {user} = await requireAdmin();
  const supabase = createAdminClient();
  const id = recordIdSchema.parse(formData.get("id"));
  const {error} = await supabase.from("ask_eff_knowledge_records").update({publication_status: "published", approved_by: user.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString()}).eq("id", id).eq("publication_status", "draft");
  if (error) throw new Error("The record could not be published.");
  await supabase.from("ask_eff_admin_audit").insert({actor_id: user.id, action: "knowledge_record_published", record_type: "knowledge_record", record_id: id});
  revalidatePath("/admin/ask");
}

export async function retireKnowledgeRecord(formData: FormData) {
  const {user} = await requireAdmin();
  const supabase = createAdminClient();
  const id = recordIdSchema.parse(formData.get("id"));
  const {error} = await supabase.from("ask_eff_knowledge_records").update({publication_status: "retired", updated_at: new Date().toISOString()}).eq("id", id);
  if (error) throw new Error("The record could not be retired.");
  await supabase.from("ask_eff_admin_audit").insert({actor_id: user.id, action: "knowledge_record_retired", record_type: "knowledge_record", record_id: id});
  revalidatePath("/admin/ask");
}

const runtimeSettingsSchema = z.object({
  generationEnabled: z.enum(["on", "off"]),
  webSearchEnabled: z.enum(["on", "off"]),
  requestsPerUserPerDay: z.coerce.number().int().min(1).max(100),
  dailyBudgetUsd: z.coerce.number().min(0.1).max(10_000),
});

export async function updateRuntimeSettings(formData: FormData) {
  const {user} = await requireAdmin();
  const supabase = createAdminClient();
  const value = runtimeSettingsSchema.parse({
    generationEnabled: formData.get("generationEnabled"),
    webSearchEnabled: formData.get("webSearchEnabled"),
    requestsPerUserPerDay: formData.get("requestsPerUserPerDay"),
    dailyBudgetUsd: formData.get("dailyBudgetUsd"),
  });
  const {error} = await supabase.from("ask_eff_runtime_settings").upsert({
    id: 1,
    generation_enabled: value.generationEnabled === "on",
    web_search_enabled: value.webSearchEnabled === "on",
    requests_per_user_per_day: value.requestsPerUserPerDay,
    daily_budget_usd: value.dailyBudgetUsd,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error("Ask EFF runtime settings could not be updated.");
  await supabase.from("ask_eff_admin_audit").insert({actor_id: user.id, action: "runtime_settings_updated", record_type: "runtime_settings", record_id: "1", safe_metadata: {generationEnabled: value.generationEnabled, webSearchEnabled: value.webSearchEnabled, requestsPerUserPerDay: value.requestsPerUserPerDay, dailyBudgetUsd: value.dailyBudgetUsd}});
  revalidatePath("/admin/ask");
}
