import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CheckCircle2, FileImage, ShieldCheck, Vote } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

async function respondToBoardRole(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/careers/board-onboarding");

  const admin = createAdminClient();
  const { data: member } = await admin.from("national_member_profiles")
    .select("board_role_status,headshot_path")
    .eq("user_id", user.id)
    .single();
  if (!member || !["offered", "accepted_pending_board_action"].includes(member.board_role_status)) {
    redirect("/careers/board-onboarding?error=No+active+board+role+offer+was+found.");
  }

  const response = text(formData, "response", 20);
  const now = new Date().toISOString();
  if (response === "decline") {
    await admin.from("national_member_profiles").update({
      board_role_status: "declined",
      role_responded_at: now,
      updated_at: now,
    }).eq("user_id", user.id);
    await admin.from("board_role_history").insert({
      user_id: user.id,
      previous_status: member.board_role_status,
      new_status: "declined",
      changed_by: user.id,
      note: "Member declined the proposed board role through the secure portal.",
    });
    revalidatePath("/careers/dashboard");
    redirect("/careers/board-onboarding?declined=1");
  }

  const publicEmail = text(formData, "publicEmail", 180).toLowerCase();
  const signature = text(formData, "signature", 120);
  if (!publicEmail || !publicEmail.includes("@")) redirect("/careers/board-onboarding?error=Please+enter+a+valid+board+contact+email.");
  if (signature.length < 2) redirect("/careers/board-onboarding?error=Please+type+your+full+name+as+your+electronic+signature.");
  const requiredChecks = ["fiduciary", "confidentiality", "conflicts", "unpaid"];
  if (requiredChecks.some((key) => text(formData, key, 5) !== "on")) {
    redirect("/careers/board-onboarding?error=Please+review+and+confirm+all+board+service+acknowledgments.");
  }

  let headshotPath = member.headshot_path as string | null;
  const headshot = formData.get("headshot");
  if (headshot instanceof File && headshot.size > 0) {
    if (!acceptedTypes.has(headshot.type) || headshot.size > 5 * 1024 * 1024) {
      redirect("/careers/board-onboarding?error=Your+headshot+must+be+a+JPG,+PNG,+or+WEBP+file+no+larger+than+5+MB.");
    }
    const extension = headshot.type === "image/png" ? "png" : headshot.type === "image/webp" ? "webp" : "jpg";
    const newPath = `${user.id}/headshot-${Date.now()}.${extension}`;
    const uploaded = await admin.storage.from("board-headshots").upload(newPath, headshot, {
      contentType: headshot.type,
      upsert: false,
    });
    if (uploaded.error) redirect("/careers/board-onboarding?error=Your+headshot+could+not+be+uploaded.+Please+try+again.");
    if (headshotPath) await admin.storage.from("board-headshots").remove([headshotPath]);
    headshotPath = newPath;
  }
  if (!headshotPath) redirect("/careers/board-onboarding?error=Please+upload+a+professional+headshot.");

  const { error } = await admin.from("national_member_profiles").update({
    board_role_status: "accepted_pending_board_action",
    public_email: publicEmail,
    headshot_path: headshotPath,
    role_responded_at: now,
    fiduciary_acknowledged: true,
    confidentiality_acknowledged: true,
    conflicts_acknowledged: true,
    unpaid_service_acknowledged: true,
    electronic_signature: signature,
    updated_at: now,
  }).eq("user_id", user.id);
  if (error) redirect("/careers/board-onboarding?error=Your+acceptance+could+not+be+saved.+Please+try+again.");

  await admin.from("board_role_history").insert({
    user_id: user.id,
    previous_status: member.board_role_status,
    new_status: "accepted_pending_board_action",
    changed_by: user.id,
    note: "Member accepted the proposed unpaid board role and completed required acknowledgments.",
  });
  revalidatePath("/careers/dashboard");
  revalidatePath("/admin/careers/members");
  redirect("/careers/board-onboarding?accepted=1");
}

const statusLabel: Record<string, string> = {
  offered: "Action required",
  accepted_pending_board_action: "Accepted — pending formal board action",
  appointed: "Formally appointed",
  declined: "Declined",
  ended: "Service ended",
};

export default async function BoardOnboarding({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; accepted?: string; declined?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/careers/board-onboarding");

  const [{ data: base }, { data: member }] = await Promise.all([
    supabase.from("profiles").select("legal_name,preferred_name,primary_email").eq("id", user.id).single(),
    supabase.from("national_member_profiles").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!member || member.board_role_status === "not_offered") {
    return <main className="section white"><div className="shell career-application-shell">
      <Link className="card-link" href="/careers/dashboard">← Careers dashboard</Link>
      <div className="notice"><strong>No board role offer is assigned to this account.</strong><br />EFF National Office must first document the proposed role and governance scope.</div>
    </div></main>;
  }

  const canRespond = ["offered", "accepted_pending_board_action"].includes(member.board_role_status);
  const displayName = base?.preferred_name || base?.legal_name || "Board candidate";

  return <main className="section white"><div className="shell career-application-shell">
    <Link className="card-link" href="/careers/dashboard">← Careers dashboard</Link>
    <div className="section-head">
      <div><div className="eyebrow">Secure board onboarding</div><h2>{member.role_title || "Proposed board role"}</h2><p>Welcome, {displayName}. Review the role EFF has proposed and record your response below.</p></div>
      <span className="status">{statusLabel[member.board_role_status] || member.board_role_status}</span>
    </div>

    {params.error && <div className="notice error-text" role="alert">{params.error}</div>}
    {params.accepted && <div className="notice"><CheckCircle2 /> <strong>Your acceptance was recorded.</strong><br />This remains pending until EFF completes the appointment process required by its bylaws and formal board action.</div>}
    {params.declined && <div className="notice">Your decision to decline was recorded. Thank you for responding.</div>}

    <div className="career-detail-grid">
      <section className="career-detail-card"><h3>What you will govern</h3><p>{member.governance_scope || "EFF National Office has not yet documented this scope."}</p></section>
      <section className="career-detail-card"><h3>What you may vote on</h3><p>{member.voting_scope || "Voting authority will be defined by EFF’s bylaws, conflicts policy, and formal board action."}</p></section>
      <section className="career-detail-card"><h3>Your responsibilities</h3><p>{member.board_responsibilities || "EFF National Office has not yet documented the role responsibilities."}</p></section>
      <section className="career-detail-card"><h3>Important distinction</h3><p>Portal acceptance does not itself appoint you as a director. Formal appointment occurs only through EFF’s governing documents and recorded board action.</p></section>
    </div>

    {canRespond && <form action={respondToBoardRole} className="application-form career-form" encType="multipart/form-data">
      <input type="hidden" name="response" value="accept" />
      <section className="form-section"><span className="section-number">01</span><h3>Contact and headshot</h3>
        <div className="form-grid">
          <label>Account email<input value={base?.primary_email ?? user.email ?? ""} readOnly aria-readonly="true" /></label>
          <label>Board contact email<input name="publicEmail" type="email" required maxLength={180} defaultValue={member.public_email ?? base?.primary_email ?? user.email ?? ""} /></label>
          <label className="full-field career-upload"><FileImage /><strong>Professional headshot</strong><span>JPG, PNG, or WEBP, up to 5 MB. This remains private until EFF obtains permission for public use.</span><input name="headshot" type="file" accept="image/jpeg,image/png,image/webp" required={!member.headshot_path} /></label>
        </div>
      </section>
      <section className="form-section"><span className="section-number">02</span><h3>Board service acknowledgments</h3>
        <div className="career-privacy"><ShieldCheck /><p>Read each statement carefully. These acknowledgments document your understanding; they do not replace EFF’s bylaws, conflicts policy, appointment resolution, or other governing documents.</p></div>
        <label className="check"><input name="fiduciary" type="checkbox" required /><span>I understand the fiduciary duties of care, loyalty, and obedience and will act in EFF’s best interests and charitable mission.</span></label>
        <label className="check"><input name="confidentiality" type="checkbox" required /><span>I will protect confidential organizational, donor, applicant, student, and financial information.</span></label>
        <label className="check"><input name="conflicts" type="checkbox" required /><span>I will disclose actual or potential conflicts and abstain when required. I understand EFF and PGWS are separate organizations.</span></label>
        <label className="check"><input name="unpaid" type="checkbox" required /><span>I understand this is unpaid governing-board service and creates no employment, scholarship, or compensation promise.</span></label>
        <label>Type your full legal name as your electronic signature<input name="signature" required maxLength={120} defaultValue={member.electronic_signature ?? base?.legal_name ?? ""} /></label>
      </section>
      <div className="form-actions">
        <button className="button" type="submit"><Vote size={17} /> Accept proposed role</button>
        <button className="button outline" type="submit" name="response" value="decline" formNoValidate>Decline role</button>
      </div>
    </form>}
  </div></main>;
}
