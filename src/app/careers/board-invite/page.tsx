import { createHash } from "crypto";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function cleanCode(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().replace(/\s+/g, "").toLowerCase();
}

async function claimBoardInvite(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/sign-in?next=/careers/board-invite");

  const code = cleanCode(formData.get("inviteCode"));
  if (code.length < 12 || code.length > 100) {
    redirect("/careers/board-invite?error=Enter+the+complete+invitation+code+provided+by+EFF.");
  }
  const codeHash = createHash("sha256").update(code).digest("hex");
  const admin = createAdminClient();
  const { data: invite } = await admin.from("board_role_invites")
    .select("*")
    .eq("code_hash", codeHash)
    .is("claimed_by", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!invite) redirect("/careers/board-invite?error=This+invitation+code+is+invalid,+expired,+revoked,+or+already+used.");
  if (invite.intended_email && invite.intended_email.toLowerCase() !== user.email.toLowerCase()) {
    redirect("/careers/board-invite?error=This+code+was+issued+to+a+different+email+address.+Sign+in+with+the+invited+account+or+contact+EFF.");
  }

  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await admin.from("board_role_invites").update({
    claimed_by: user.id,
    claimed_at: now,
  }).eq("id", invite.id).is("claimed_by", null).select("id").maybeSingle();
  if (claimError || !claimed) redirect("/careers/board-invite?error=This+code+was+already+claimed.+Contact+EFF+if+you+need+help.");

  const { data: prior } = await admin.from("national_member_profiles")
    .select("board_role_status")
    .eq("user_id", user.id)
    .maybeSingle();
  const { error: profileError } = await admin.from("national_member_profiles").upsert({
    user_id: user.id,
    role_title: invite.role_title,
    board_role_status: "offered",
    board_responsibilities: invite.board_responsibilities,
    governance_scope: invite.governance_scope,
    voting_scope: invite.voting_scope,
    role_offered_at: now,
    updated_at: now,
  }, { onConflict: "user_id" });
  if (profileError) {
    await admin.from("board_role_invites").update({ claimed_by: null, claimed_at: null }).eq("id", invite.id).eq("claimed_by", user.id);
    redirect("/careers/board-invite?error=Your+board+workspace+could+not+be+created.+The+code+was+not+used;+please+try+again.");
  }

  await admin.from("board_role_history").insert({
    user_id: user.id,
    previous_status: prior?.board_role_status ?? "not_offered",
    new_status: "offered",
    changed_by: user.id,
    note: `Single-use board invitation claimed: ${invite.invite_label}.`,
  });
  revalidatePath("/careers/dashboard");
  revalidatePath("/careers/board-onboarding");
  revalidatePath("/admin/careers/members");
  revalidatePath("/admin/careers/board-invites");
  redirect("/careers/board-onboarding?invite=claimed");
}

export default async function BoardInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/careers/board-invite");

  return <main className="section white"><div className="shell career-success">
    <KeyRound />
    <div className="eyebrow">EFF board invitation</div>
    <h2>Enter your private invitation code.</h2>
    <p>Use the single-use code provided by EFF National Office. After it is verified, you will review the proposed role, governance responsibilities, and voting scope before choosing whether to accept.</p>
    {error && <div className="notice error-text" role="alert">{error}</div>}
    <form action={claimBoardInvite} className="application-form career-form" style={{ width: "100%", textAlign: "left" }}>
      <section className="form-section">
        <label>Board invitation code<input name="inviteCode" required minLength={12} maxLength={100} autoComplete="one-time-code" placeholder="Enter the complete code" /></label>
        <div className="career-privacy"><ShieldCheck /><p>Codes are single-use, expire automatically, and may be restricted to the invited email address. Never post or forward your code publicly.</p></div>
      </section>
      <div className="form-actions">
        <Link className="button outline" href="/careers/dashboard">Cancel</Link>
        <button className="button" type="submit">Verify invitation</button>
      </div>
    </form>
  </div></main>;
}
