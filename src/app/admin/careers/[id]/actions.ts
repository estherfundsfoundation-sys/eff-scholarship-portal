"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireAdmin} from "@/lib/auth/staff";
import {createAdminClient} from "@/lib/supabase/admin";

export async function updateCareerStatus(formData:FormData){const id=String(formData.get("id")??"");const status=String(formData.get("status")??"");const note=String(formData.get("note")??"").trim();if(!["submitted","in_review","interview","selected","not_selected","withdrawn"].includes(status))throw new Error("Invalid status");const {user}=await requireAdmin();const admin=createAdminClient();const {data:prior}=await admin.from("career_applications").select("status").eq("id",id).single();const {error}=await admin.from("career_applications").update({status,internal_note:note||null,updated_at:new Date().toISOString()}).eq("id",id);if(error)throw new Error("The careers application could not be updated.");await admin.from("career_application_history").insert({application_id:id,previous_status:prior?.status??null,new_status:status,changed_by:user.id,note:note||null});revalidatePath(`/admin/careers/${id}`);revalidatePath("/admin/careers");redirect(`/admin/careers/${id}?updated=1`)}
