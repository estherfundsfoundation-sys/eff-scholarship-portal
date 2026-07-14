import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
export async function requireStaff(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/sign-in?next=/admin");const {data:roles}=await supabase.from("user_roles").select("role,program_id").eq("user_id",user.id);if(!roles?.some(item=>["reviewer","finance","program_admin","super_admin"].includes(item.role)))redirect("/dashboard");return {supabase,user,roles}}
export async function requireAdmin(){const context=await requireStaff();if(!context.roles.some(item=>["program_admin","super_admin"].includes(item.role)))redirect("/admin");return context}
export async function requireSuperAdmin(){const context=await requireStaff();if(!context.roles.some(item=>item.role==="super_admin"))redirect("/admin");return context}
