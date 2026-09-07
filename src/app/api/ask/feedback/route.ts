import {NextResponse} from "next/server";
import {feedbackRequestSchema} from "@/lib/ask-eff/schema";
import {getAskEffConfig} from "@/lib/ask-eff/config";
import {createAdminClient} from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!getAskEffConfig().enabled) return NextResponse.json({error: "Ask EFF is disabled."}, {status: 503});
  const parsed = feedbackRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({error: "The report could not be submitted."}, {status: 400});
  try {
    const admin = createAdminClient();
    const {error} = await admin.from("ask_eff_feedback").insert({
      request_id: parsed.data.requestId,
      conversation_id: parsed.data.conversationId,
      message_id: parsed.data.messageId,
      answer: parsed.data.answer,
      last_question: parsed.data.lastQuestion ?? null,
      consent_to_share: true,
    });
    if (error) throw error;
    return NextResponse.json({ok: true}, {headers: {"Cache-Control": "no-store"}});
  } catch {
    return NextResponse.json({error: "The report could not be saved right now."}, {status: 503});
  }
}
