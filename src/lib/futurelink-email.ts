import "server-only";
import {createAdminClient} from "@/lib/supabase/admin";

export async function queueFutureLinkEmail(input:{userId:string;templateKey:string;idempotencyKey:string;payload:Record<string,unknown>}){
  const admin=createAdminClient();
  const {data}=await admin.from("profiles").select("primary_email,legal_name,preferred_name").eq("id",input.userId).maybeSingle();
  if(!data?.primary_email)return false;
  const {error}=await admin.from("messages").upsert({recipient:data.primary_email,idempotency_key:input.idempotencyKey,status:"queued",template_key:input.templateKey,payload_private:{name:data.preferred_name||data.legal_name||"FutureLink participant",...input.payload},next_attempt_at:new Date().toISOString()},{onConflict:"idempotency_key",ignoreDuplicates:true});
  return !error;
}
