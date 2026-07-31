import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {isActiveStaffRole} from "@/lib/staff-access";
export async function requireStaff(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/admin/sign-in?next=/admin");const {data:roles}=await supabase.from("user_roles").select("role,program_id,active").eq("user_id",user.id).eq("active",true);if(!roles?.some(item=>isActiveStaffRole(item.role,item.active)))redirect("/admin/sign-in?denied=1&next=/admin");return {supabase,user,roles}}
export async function requireAdmin(){const context=await requireStaff();if(!context.roles.some(item=>["program_admin","super_admin"].includes(item.role)))redirect("/admin");return context}
export async function requireSuperAdmin(){const context=await requireStaff();if(!context.roles.some(item=>item.role==="super_admin"))redirect("/admin");return context}
