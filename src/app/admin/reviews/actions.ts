"use server";
import {revalidatePath} from "next/cache";
import {requireStaff} from "@/lib/auth/staff";

export async function submitReview(formData: FormData) {
  const {supabase} = await requireStaff();
  const assignmentId = String(formData.get("assignment_id") ?? "");
  const hasConflict = formData.get("has_conflict") === "yes";
  const scores: Record<string, number> = {};
  for (const [key, value] of formData.entries()) if (key.startsWith("score_")) {const score=Number(value);if(!Number.isInteger(score)||score<1||score>5)throw new Error("Scores must be whole numbers from 1 to 5.");scores[key.slice(6)]=score;}
  if (!hasConflict && Object.keys(scores).length === 0) throw new Error("Complete the rubric before submitting.");
  const {error} = await supabase.rpc("submit_application_review", {p_assignment_id: assignmentId, p_scores: scores, p_notes: String(formData.get("notes") ?? ""), p_has_conflict: hasConflict, p_conflict_details: String(formData.get("conflict_details") ?? "")});
  if (error) throw new Error(error.message);
  revalidatePath("/admin/reviews");
}
