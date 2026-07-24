import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/staff";

async function updateMember(formData: FormData) {
  "use server";
  const { user } = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const roleTitle = String(formData.get("roleTitle") ?? "").trim().slice(0, 160) || null;
  const membershipStatus = String(formData.get("membershipStatus") ?? "");
  const boardRoleStatus = String(formData.get("boardRoleStatus") ?? "not_offered");
  const boardResponsibilities = String(formData.get("boardResponsibilities") ?? "").trim().slice(0, 5000) || null;
  const governanceScope = String(formData.get("governanceScope") ?? "").trim().slice(0, 5000) || null;
  const votingScope = String(formData.get("votingScope") ?? "").trim().slice(0, 5000) || null;
  if (!userId || !["pending", "active", "inactive"].includes(membershipStatus)) throw new Error("Invalid member update.");
  if (!["not_offered", "offered", "accepted_pending_board_action", "appointed", "declined", "ended"].includes(boardRoleStatus)) throw new Error("Invalid board role status.");
  if (boardRoleStatus !== "not_offered" && (!roleTitle || !boardResponsibilities || !governanceScope || !votingScope)) {
    throw new Error("Board role, responsibilities, governance scope, and voting scope are required before an offer can be recorded.");
  }

  const admin = createAdminClient();
  const { data: prior } = await admin.from("national_member_profiles").select("role_title,membership_status,board_role_status").eq("user_id", userId).single();
  const now = new Date().toISOString();
  const { error } = await admin.from("national_member_profiles").update({
    role_title: roleTitle,
    membership_status: membershipStatus,
    board_role_status: boardRoleStatus,
    board_responsibilities: boardResponsibilities,
    governance_scope: governanceScope,
    voting_scope: votingScope,
    role_offered_at: boardRoleStatus === "offered" && prior?.board_role_status !== "offered" ? now : undefined,
    formally_appointed_at: boardRoleStatus === "appointed" && prior?.board_role_status !== "appointed" ? now : undefined,
    updated_at: now,
  }).eq("user_id", userId);
  if (error) throw new Error("The national member profile could not be updated.");

  await admin.from("national_member_profile_history").insert({
    user_id: userId,
    previous_role: prior?.role_title ?? null,
    new_role: roleTitle,
    previous_status: prior?.membership_status ?? null,
    new_status: membershipStatus,
    changed_by: user.id,
  });
  if (prior?.board_role_status !== boardRoleStatus) {
    await admin.from("board_role_history").insert({
      user_id: userId,
      previous_status: prior?.board_role_status ?? null,
      new_status: boardRoleStatus,
      changed_by: user.id,
      note: "Board role status updated by an authorized EFF administrator.",
    });
  }

  revalidatePath("/admin/careers/members");
  revalidatePath("/careers/dashboard");
  revalidatePath("/careers/board-onboarding");
  redirect("/admin/careers/members?updated=1");
}

export default async function NationalMembersAdmin({ searchParams }: { searchParams: Promise<{ updated?: string }> }) {
  const { updated } = await searchParams;
  await requireAdmin();
  const admin = createAdminClient();
  const { data: members, error } = await admin.from("national_member_profiles").select("*").order("updated_at", { ascending: false }).limit(250);
  const ids = (members ?? []).map((member) => member.user_id);
  const { data: people } = ids.length
    ? await admin.from("profiles").select("id,legal_name,preferred_name,primary_email").in("id", ids)
    : { data: [] };
  const peopleMap = new Map((people ?? []).map((person) => [person.id, person]));

  return (
    <main className="section white">
      <div className="shell">
        <Link href="/admin/careers" className="card-link">← Careers applications</Link>
        <div className="section-head">
          <div>
            <div className="eyebrow">National team</div>
            <h2>Member profiles</h2>
            <p className="muted">Assign verified roles and membership status. Changes are recorded in the administrative history.</p>
          </div>
        </div>

        {updated && <div className="notice">National member role and status updated.</div>}
        {error && <div className="notice error-text">Member profiles could not be loaded.</div>}

        <div className="stack" style={{ marginTop: 24 }}>
          {(members ?? []).map((member) => {
            const person = peopleMap.get(member.user_id);
            return (
              <article className="card" key={member.user_id}>
                <div className="eyebrow">{member.membership_status} · {member.board_role_status?.replaceAll("_", " ") ?? "not offered"}</div>
                <h3>{member.display_name || person?.preferred_name || person?.legal_name || "National member"}</h3>
                <p className="muted">{person?.primary_email}<br />{member.school_or_employer}<br />{member.location_timezone}</p>
                {member.short_bio && <p>{member.short_bio}</p>}
                {member.headshot_path && <p><strong>Headshot:</strong> securely uploaded</p>}
                {member.public_email && <p><strong>Board contact:</strong> {member.public_email}</p>}
                <form action={updateMember} className="stack">
                  <input type="hidden" name="userId" value={member.user_id} />
                  <div className="form-grid">
                    <label>Proposed or appointed board role<input name="roleTitle" maxLength={160} placeholder="Example: National Treasurer" defaultValue={member.role_title ?? ""} /></label>
                    <label>National member status<select name="membershipStatus" defaultValue={member.membership_status}>
                      <option value="pending">Pending</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select></label>
                    <label>Board role status<select name="boardRoleStatus" defaultValue={member.board_role_status ?? "not_offered"}>
                      <option value="not_offered">Not offered</option>
                      <option value="offered">Offered — awaiting response</option>
                      <option value="accepted_pending_board_action">Accepted — pending formal board action</option>
                      <option value="appointed">Formally appointed</option>
                      <option value="declined">Declined</option>
                      <option value="ended">Service ended</option>
                    </select></label>
                    <label className="full-field">Responsibilities<textarea name="boardResponsibilities" maxLength={5000} placeholder="Describe the recurring oversight, preparation, participation, and follow-through expected for this role." defaultValue={member.board_responsibilities ?? ""} /></label>
                    <label className="full-field">What this role governs<textarea name="governanceScope" maxLength={5000} placeholder="Describe the programs, finances, policies, partnerships, risks, or student-support systems this director will oversee." defaultValue={member.governance_scope ?? ""} /></label>
                    <label className="full-field">What this director may vote on<textarea name="votingScope" maxLength={5000} placeholder="Describe voting authority and note that conflicts, bylaws, and applicable law may require abstention or limit a vote." defaultValue={member.voting_scope ?? ""} /></label>
                  </div>
                  <button className="button">Save member</button>
                </form>
              </article>
            );
          })}
          {!members?.length && !error && <div className="card"><h3>No member profiles yet</h3><p className="muted">Profiles will appear after national members create them from their secure Candidate Center.</p></div>}
        </div>
      </div>
    </main>
  );
}
