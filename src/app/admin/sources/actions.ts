"use server";
import {revalidatePath} from "next/cache";
import {requireAdmin} from "@/lib/auth/staff";
import {runSource} from "@/lib/importers/run";
export async function configureSource(formData:FormData){const {supabase}=await requireAdmin();const id=String(formData.get("source_id"));const active=formData.get("active")==="on";const frequency=Number(formData.get("frequency_minutes"));const {error}=await supabase.rpc("set_external_source_state",{p_source_id:id,p_active:active,p_frequency_minutes:frequency});if(error)throw new Error(error.message);revalidatePath("/admin/sources")}
export async function retrySource(formData:FormData){await requireAdmin();await runSource(String(formData.get("source_key")));revalidatePath("/admin/sources")}
export async function resolveReport(formData:FormData){const {supabase,user}=await requireAdmin();const id=String(formData.get("report_id"));const {error}=await supabase.from("scholarship_reports").update({resolved_at:new Date().toISOString(),resolved_by:user.id}).eq("id",id);if(error)throw new Error("The report could not be resolved.");await supabase.from("audit_events").insert({actor_id:user.id,action:"scholarship_report_resolved",target_type:"scholarship_report",target_id:id});revalidatePath("/admin/sources")}
