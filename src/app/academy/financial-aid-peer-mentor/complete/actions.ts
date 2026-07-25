"use server";

import {redirect} from "next/navigation";
import {z} from "zod";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";
import {FINANCIAL_AID_PEER_MENTOR_COURSE_ID} from "@/lib/academy/financial-aid-peer-mentor";

const certificateNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(90)
  .regex(/^[\p{L}\p{M}][\p{L}\p{M}\s.,'’\-]*$/u);

export async function saveCertificateName(formData: FormData) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/academy/financial-aid-peer-mentor/complete");

  const parsed = certificateNameSchema.safeParse(formData.get("certificateName"));
  if (!parsed.success) redirect("/academy/financial-aid-peer-mentor/complete?error=name");

  const admin = createAdminClient();
  const {data: completion} = await admin
    .from("academy_course_completions")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", FINANCIAL_AID_PEER_MENTOR_COURSE_ID)
    .maybeSingle();
  if (!completion) redirect("/academy/financial-aid-peer-mentor");

  const {error} = await admin
    .from("academy_course_completions")
    .update({certificate_name: parsed.data})
    .eq("id", completion.id);
  if (error) {
    console.error("Academy certificate name could not be saved", error);
    redirect("/academy/financial-aid-peer-mentor/complete?error=save");
  }

  redirect("/academy/financial-aid-peer-mentor/complete?saved=1");
}
