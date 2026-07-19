"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireAdmin} from "@/lib/auth/staff";

const allowedStatuses=["review_by_admin","additional_information_needed","approved","denied","withdrawn","archived"];

export async function bulkTransitionApplications(formData:FormData){
  const {supabase}=await requireAdmin();
  const ids=formData.getAll("application_ids").map(String).filter(Boolean);
  const status=String(formData.get("new_status")??"");
  const reason=String(formData.get("reason")??"").trim();
  const applicantNote=String(formData.get("applicant_note")??"").trim();
  if(!ids.length)redirect("/admin/applications?bulk_error="+encodeURIComponent("Select at least one application."));
  if(!allowedStatuses.includes(status))redirect("/admin/applications?bulk_error="+encodeURIComponent("Choose a valid status."));
  if(!reason)redirect("/admin/applications?bulk_error="+encodeURIComponent("Enter the internal reason for this bulk update."));
  let changed=0;let failed=0;const selected=ids.slice(0,250);
  for(let from=0;from<selected.length;from+=10){
    const results=await Promise.all(selected.slice(from,from+10).map(id=>supabase.rpc("staff_transition_application",{p_application_id:id,p_new_status:status,p_reason:reason,p_applicant_note:applicantNote||null})));
    for(const result of results){if(result.error)failed+=1;else changed+=1}
  }
  revalidatePath("/admin/applications");
  redirect(`/admin/applications?bulk_updated=${changed}&bulk_failed=${failed}`);
}
