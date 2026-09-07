import {createHash} from "node:crypto";
import {NextRequest, NextResponse} from "next/server";
import {askEffRequestSchema} from "@/lib/ask-eff/schema";
import {getAskEffConfig} from "@/lib/ask-eff/config";
import {containsSensitiveData, disclosesUnderage, extractInstitutionMention, isEducationRelated, isUrgentSafetyMessage, needsCurrentResearch} from "@/lib/ask-eff/safety";
import {hashAskEffSubject, reserveAskEffBudget, verifyPilotCode} from "@/lib/ask-eff/quota";
import {answerWithAskEff, researchCurrentEducationInformation} from "@/lib/ask-eff/openai";
import {findApprovedChapter, findApprovedPublicContact, loadApprovedProgramOverrides, loadApprovedPublicKnowledge, loadAskEffRuntimeSettings, ownerApprovedPrograms} from "@/lib/ask-eff/knowledge";
import {relevantPrograms} from "@/lib/ask-eff/program-registry";
import {createClient} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = {"Cache-Control": "no-store, max-age=0", "X-Robots-Tag": "noindex"};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {status, headers: noStoreHeaders});
}

export async function POST(request: NextRequest) {
  const config = getAskEffConfig();
  if (!config.enabled) return json({error: "Ask EFF is not available yet. Existing EFF resources are still available."}, 503);
  if (!config.openAiApiKey && !config.mockMode) return json({error: "Ask EFF is temporarily unavailable. Please use the Student Resources page while the service is restored."}, 503);
  let payload: unknown;
  try { payload = await request.json(); } catch { return json({error: "The request could not be read."}, 400); }
  const parsed = askEffRequestSchema.safeParse(payload);
  if (!parsed.success) return json({error: "Please confirm you are 18 or older and try again."}, 400);
  if (config.pilotOnly && !verifyPilotCode(parsed.data.pilotCode)) return json({error: "This controlled pilot requires a valid access code."}, 403);
  const messages = parsed.data.messages.slice(-config.maxMessages);
  const latest = messages.at(-1)?.content ?? "";
  if (latest.length > config.maxInputCharacters) return json({error: "Please shorten your question and try again."}, 413);
  if (disclosesUnderage(latest)) return json({answer: "Ask EFF's personalized pilot is currently for adults 18 and older. You can still use EFF's public Student Resources page without sharing personal details. If you may be in immediate danger, contact local emergency services or a trusted adult now.", sources: [{id: "EFF1", title: "EFF Student Resources", url: "https://portal.estherfundsfoundation.org/resources", sourceType: "eff_resource", accessedAt: new Date().toISOString()}], mode: "safety"});
  if (isUrgentSafetyMessage(latest)) return json({answer: "I’m really glad you said something. If you may act on these thoughts or are in immediate danger, call emergency services now. In the United States, call or text 988 for the Suicide & Crisis Lifeline. If you can, move near another person you trust and tell them clearly that you need immediate support. Ask EFF is not monitored by staff and cannot contact help for you.", sources: [{id: "WEB1", title: "988 Suicide & Crisis Lifeline", url: "https://988lifeline.org", sourceType: "external_official", accessedAt: new Date().toISOString()}], mode: "safety"});
  if (containsSensitiveData(latest)) return json({error: "Please remove passwords, Social Security numbers, student IDs, banking details, email addresses, phone numbers, or other sensitive identifiers before sending your question."}, 422);
  if (!isEducationRelated(latest) && messages.length === 1) return json({answer: "Ask EFF focuses on college success, educational barriers, and Esther Funds Foundation. If your question connects to school or EFF, tell me that part and I’ll help you find a practical next step.", sources: [], mode: "boundary"});
  try {
    const runtimeSettings = await loadAskEffRuntimeSettings();
    if (runtimeSettings?.generationEnabled === false) return json({error: "Ask EFF is temporarily paused by Nationals. Existing EFF resources remain available."}, 503);
    let userId: string | null = null;
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const supabase = await createClient();
      const {data: {user}} = await supabase.auth.getUser();
      userId = user?.id ?? null;
    }
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const anonymous = createHash("sha256").update(`${forwarded}:${request.headers.get("user-agent") ?? ""}`).digest("hex");
    const subjectHash = config.mockMode ? "mock-local-subject" : hashAskEffSubject(userId ?? anonymous);
    const reservation = await reserveAskEffBudget(subjectHash, parsed.data.requestId, runtimeSettings ? {requestsPerUserPerDay: runtimeSettings.requestsPerUserPerDay, dailyBudgetUsd: runtimeSettings.dailyBudgetUsd} : undefined);
    if (!reservation.allowed) return json({error: reservation.reason === "daily_budget" ? "Ask EFF has reached today's pilot limit. Existing EFF resources remain available." : "You have reached today's Ask EFF message limit."}, 429);
    const programs = relevantPrograms(messages.map((message) => message.content).join(" "));
    const currentPrograms = await loadApprovedProgramOverrides(programs.length ? programs : ownerApprovedPrograms.slice(0, 2));
    const approvedKnowledge: unknown[] = await loadApprovedPublicKnowledge(messages.map((message) => message.content).join(" "), 10);
    const institution = extractInstitutionMention(latest);
    if (institution && /\bchapter\b/i.test(latest)) approvedKnowledge.push({category: "current_status", topic: `Chapter lookup for ${institution}`, result: await findApprovedChapter(institution)});
    if (/\b(who|contact|handles|founded|founder|president|director|chair)\b/i.test(latest)) approvedKnowledge.push({category: "public_role", topic: "Approved public role/contact lookup", result: await findApprovedPublicContact(latest)});
    const research = needsCurrentResearch(latest) ? await researchCurrentEducationInformation(latest, runtimeSettings?.webSearchEnabled ?? true) : undefined;
    const result = await answerWithAskEff({messages, programs: currentPrograms, approvedKnowledge, research});
    return json({...result, requestId: parsed.data.requestId});
  } catch (error) {
    console.error("Ask EFF request failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unknown failure",
    });
    return json({error: "Ask EFF could not complete that response. Please try again later or use the Student Resources page."}, 503);
  }
}
