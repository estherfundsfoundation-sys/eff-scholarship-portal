"use server";

import {revalidatePath} from "next/cache";
import {z} from "zod";
import {requireAdmin} from "@/lib/auth/staff";
import {createAdminClient} from "@/lib/supabase/admin";

const schema=z.object({caseId:z.string().uuid(),status:z.enum(["advocacy_sent","howard_review","reinstated","student_withdrew","closed_no_resolution","delivery_failed"]),staffNote:z.string().trim().max(3000)});

export async function updateHowardCase(formData:FormData){
  const {user}=await requireAdmin();const parsed=schema.safeParse({caseId:String(formData.get("caseId")??""),status:String(formData.get("status")??""),staffNote:String(formData.get("staffNote")??"")});
  if(!parsed.success)throw new Error("Review the case status and note.");
  const admin=createAdminClient();const {error}=await admin.from("howard_help_cases").update({status:parsed.data.status,staff_note:parsed.data.staffNote||null,updated_at:new Date().toISOString()}).eq("id",parsed.data.caseId);
  if(error)throw new Error("The Howard Help case could not be updated.");
  await admin.from("audit_events").insert({actor_id:user.id,action:"howard_help_case_updated",target_type:"howard_help_case",target_id:parsed.data.caseId,metadata_safe:{status:parsed.data.status}});
  revalidatePath("/admin/howard-help");
}
