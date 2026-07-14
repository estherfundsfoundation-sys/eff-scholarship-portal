"use server";

import {revalidatePath} from "next/cache";
import {requireAdmin} from "@/lib/auth/staff";

export async function queueInvitations(formData: FormData) {
  const {supabase} = await requireAdmin();
  const limit = Math.min(5000, Math.max(1, Number(formData.get("limit") ?? 100)));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://eff-scholarship-portal.vercel.app";
  const {error} = await supabase.rpc("queue_legacy_claim_invitations", {p_limit: limit, p_site_url: siteUrl});
  if (error) throw new Error("The invitation batch could not be queued safely.");
  revalidatePath("/admin/imports");
}
