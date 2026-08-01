"use server";

import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireAdmin} from "@/lib/auth/staff";

const allowedStatuses=["review_by_admin","approved","denied","archived"] as const;

const workspaceError=(message:string)=>`/admin/applications?bulk_error=${encodeURIComponent(message)}`;

export async function bulkTransitionApplications(formData:FormData){
  const {supabase}=await requireAdmin();
  const ids=[...new Set(formData.getAll("application_ids").map(String).filter(Boolean))].slice(0,250);
  const status=String(formData.get("new_status")??"");
  const reason=String(formData.get("reason")??"").trim();
  const applicantNote=String(formData.get("applicant_note")??"").trim();
  const confirmation=String(formData.get("confirmation")??"").trim().toUpperCase();
  const dueAt=String(formData.get("due_at")??"").trim()||null;

  if(!ids.length)redirect(workspaceError("Select at least one application."));
  if(status==="additional_information_needed"){
    if(!applicantNote)redirect(workspaceError("Describe exactly what each selected student needs to correct or upload."));
  }else if(!allowedStatuses.includes(status as (typeof allowedStatuses)[number])){
    redirect(workspaceError("Choose a valid review action."));
  }
  if(!reason)redirect(workspaceError("Enter the private internal reason for this action."));
  if(status==="approved"&&confirmation!=="APPROVE")redirect(workspaceError("Type APPROVE to confirm this bulk approval."));
  if(status==="denied"&&confirmation!=="DENY")redirect(workspaceError("Type DENY to confirm this bulk denial."));
  if(status==="denied"&&!applicantNote)redirect(workspaceError("Add a compassionate, applicant-facing explanation before denying applications."));

  const publicNote=status==="approved"
    ? applicantNote||"Your application has been approved. Your secure acceptance letter and any next steps are available in the portal. Approval does not by itself confirm a payment amount; award details are issued separately."
    : applicantNote||null;

  let changed=0;
  let failed=0;
  for(let from=0;from<ids.length;from+=10){
    const results=await Promise.all(ids.slice(from,from+10).map(id=>status==="additional_information_needed"
      ? supabase.rpc("staff_request_application_correction",{p_application_id:id,p_item:applicantNote,p_due_at:dueAt})
      : supabase.rpc("staff_transition_application",{p_application_id:id,p_new_status:status,p_reason:reason,p_applicant_note:publicNote})
    ));
    for(const result of results){if(result.error)failed+=1;else changed+=1}
  }

  revalidatePath("/admin/applications");
  redirect(`/admin/applications?bulk_updated=${changed}&bulk_failed=${failed}&bulk_action=${encodeURIComponent(status)}`);
}
