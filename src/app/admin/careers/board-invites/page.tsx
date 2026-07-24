import { createHash } from "crypto";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth/staff";
import { createAdminClient } from "@/lib/supabase/admin";

function value(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function normalizedCode(formData: FormData) {
  return value(formData, "inviteCode", 100).replace(/\s+/g, "").toLowerCase();
}

async function createBoardInvite(formData: FormData) {
  "use server";
  const { user } = await requireAdmin();
  const inviteLabel = value(formData, "inviteLabel", 160);
  const code = normalizedCode(formData);
  const confirmCode = value(formData, "confirmCode", 100).replace(/\s+/g, "").toLowerCase();
  const intendedEmail = value(formData, "intendedEmail", 180).toLowerCase() || null;
  const roleTitle = value(formData, "roleTitle", 160);
  const boardResponsibilities = value(formData, "boardResponsibilities", 5000);
  const governanceScope = value(formData, "governanceScope", 5000);
  const votingScope = value(formData, "votingScope", 5000);
  const expiresOn = value(formData, "expiresOn", 20);
  if (!inviteLabel || !roleTitle || !boardResponsibilities || !governanceScope || !votingScope || !expiresOn) {
    redirect("/admin/careers/board-invites?error=Complete+every+required+invitation+field.");
  }
  if (code.length < 12 || !/[a-z]/.test(code) || !/[0-9]/.test(code) || code !== confirmCode) {
    redirect("/admin/careers/board-invites?error=Use+a+matching+code+of+at+least+12+characters+containing+letters+and+numbers.");
  }
  if (intendedEmail && !intendedEmail.includes("@")) redirect("/admin/careers/board-invites?error=Enter+a+valid+invited+email+or+leave+it+blank.");
  const expiresAt = new Date(`${expiresOn}T23:59:59-04:00`);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    redirect("/admin/careers/board-invites?error=Choose+a+future+expiration+date.");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("board_role_invites").insert({
    invite_label: inviteLabel,
    code_hash: createHash("sha256").update(code).digest("hex"),
    intended_email: intendedEmail,
    role_title: roleTitle,
    board_responsibilities: boardResponsibilities,
    governance_scope: governanceScope,
    voting_scope: votingScope,
    expires_at: expiresAt.toISOString(),
    created_by: user.id,
  });
  if (error?.code === "23505") redirect("/admin/careers/board-invites?error=That+code+has+already+been+used.+Create+a+different+code.");
  if (error) redirect("/admin/careers/board-invites?error=The+invitation+could+not+be+created.");
  revalidatePath("/admin/careers/board-invites");
  redirect("/admin/careers/board-invites?created=1");
}

async function revokeBoardInvite(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = value(formData, "id", 80);
  const admin = createAdminClient();
  await admin.from("board_role_invites").update({ revoked_at: new Date().toISOString() }).eq("id", id).is("claimed_by", null);
  revalidatePath("/admin/careers/board-invites");
  redirect("/admin/careers/board-invites?revoked=1");
}

export default async function BoardInvitesAdmin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string; revoked?: string }>;
}) {
  const params = await searchParams;
  await requireAdmin();
  const admin = createAdminClient();
  const { data: invites } = await admin.from("board_role_invites").select("*").order("created_at", { ascending: false }).limit(100);

  return <main className="section white"><div className="shell">
    <Link href="/admin/careers/members" className="card-link">← Board member profiles</Link>
    <div className="section-head"><div><div className="eyebrow">Secure board onboarding</div><h2>Invitation codes</h2><p>Create one single-use code per person. EFF stores only a secure fingerprint of the code, so copy it before saving and deliver it privately.</p></div></div>
    {params.error && <div className="notice error-text">{params.error}</div>}
    {params.created && <div className="notice">Invitation created. Send the code privately; it cannot be viewed again here.</div>}
    {params.revoked && <div className="notice">Unused invitation revoked.</div>}

    <form action={createBoardInvite} className="application-form career-form">
      <section className="form-section"><span className="section-number">01</span><h3>Invitation identity</h3>
        <div className="form-grid">
          <label>Internal label<input name="inviteLabel" required maxLength={160} placeholder="Example: Jordan — Treasurer invitation" /></label>
          <label>Invited email <span className="optional">recommended</span><input name="intendedEmail" type="email" maxLength={180} placeholder="Locks the code to this login email" /></label>
          <label>Private invitation code<input name="inviteCode" required minLength={12} maxLength={100} autoComplete="new-password" placeholder="At least 12 letters and numbers" /></label>
          <label>Confirm invitation code<input name="confirmCode" required minLength={12} maxLength={100} autoComplete="new-password" /></label>
          <label>Expiration date<input name="expiresOn" type="date" required /></label>
        </div>
      </section>
      <section className="form-section"><span className="section-number">02</span><h3>Role and authority</h3>
        <div className="form-grid">
          <label className="full-field">Proposed board role<input name="roleTitle" required maxLength={160} placeholder="Example: National Treasurer" /></label>
          <label className="full-field">Responsibilities<textarea name="boardResponsibilities" required minLength={40} maxLength={5000} /></label>
          <label className="full-field">What this role governs<textarea name="governanceScope" required minLength={40} maxLength={5000} /></label>
          <label className="full-field">What this director may vote on<textarea name="votingScope" required minLength={40} maxLength={5000} /></label>
        </div>
        <div className="career-privacy"><ShieldCheck /><p>A code offers a proposed role; it does not formally appoint a director. Appointment still requires the action and documentation specified by EFF’s governing documents.</p></div>
      </section>
      <button className="button" type="submit"><KeyRound size={17} /> Create single-use invitation</button>
    </form>

    <div className="stack" style={{ marginTop: 32 }}>
      {(invites ?? []).map((invite) => {
        const status = invite.revoked_at ? "Revoked" : invite.claimed_by ? "Claimed" : new Date(invite.expires_at) <= new Date() ? "Expired" : "Available";
        return <article className="card" key={invite.id}>
          <div className="eyebrow">{status}</div>
          <h3>{invite.invite_label}</h3>
          <p><strong>{invite.role_title}</strong><br /><span className="muted">{invite.intended_email || "Not email-restricted"} · expires {new Date(invite.expires_at).toLocaleDateString()}</span></p>
          <p className="muted">For security, the original code is never displayed after creation.</p>
          {status === "Available" && <form action={revokeBoardInvite}><input type="hidden" name="id" value={invite.id} /><button className="button outline">Revoke unused code</button></form>}
        </article>;
      })}
      {!invites?.length && <div className="card"><h3>No invitation codes yet</h3><p className="muted">Create a separate code for each prospective board member.</p></div>}
    </div>
  </div></main>;
}
