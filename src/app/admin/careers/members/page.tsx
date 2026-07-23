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
  if (!userId || !["pending", "active", "inactive"].includes(membershipStatus)) throw new Error("Invalid member update.");

  const admin = createAdminClient();
  const { data: prior } = await admin.from("national_member_profiles").select("role_title,membership_status").eq("user_id", userId).single();
  const { error } = await admin.from("national_member_profiles").update({ role_title: roleTitle, membership_status: membershipStatus, updated_at: new Date().toISOString() }).eq("user_id", userId);
  if (error) throw new Error("The national member profile could not be updated.");

  await admin.from("national_member_profile_history").insert({
    user_id: userId,
    previous_role: prior?.role_title ?? null,
    new_role: roleTitle,
    previous_status: prior?.membership_status ?? null,
    new_status: membershipStatus,
    changed_by: user.id,
  });

  revalidatePath("/admin/careers/members");
  revalidatePath("/careers/dashboard");
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
                <div className="eyebrow">{member.membership_status}</div>
                <h3>{member.display_name || person?.preferred_name || person?.legal_name || "National member"}</h3>
                <p className="muted">{person?.primary_email}<br />{member.school_or_employer}<br />{member.location_timezone}</p>
                {member.short_bio && <p>{member.short_bio}</p>}
                <form action={updateMember} className="admin-filter">
                  <input type="hidden" name="userId" value={member.user_id} />
                  <input name="roleTitle" maxLength={160} placeholder="Verified EFF role" defaultValue={member.role_title ?? ""} />
                  <select name="membershipStatus" defaultValue={member.membership_status}>
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
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
