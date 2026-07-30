import {createHash, randomBytes} from "node:crypto";
import {NextRequest, NextResponse} from "next/server";
import {emailFrom, getResend} from "@/lib/email";
import {escapeHtml} from "@/lib/security";
import {createAdminClient} from "@/lib/supabase/admin";
import {
  buildAutomaticStudentRouting,
  contactKeysForIssue,
  type SchoolContact,
} from "@/lib/student-help-routing";

export async function GET(request: NextRequest) {
  const rawVerificationToken = request.nextUrl.searchParams.get("token");
  if (!rawVerificationToken) {
    return NextResponse.redirect(
      new URL("/help-desk/open-case?error=This+verification+link+is+invalid.", request.url),
    );
  }
  const admin = createAdminClient();
  const verificationHash = createHash("sha256")
    .update(rawVerificationToken)
    .digest("hex");
  const {data: record} = await admin
    .from("student_help_cases")
    .select(
      "id,case_code,student_name,preferred_name,email,college_unitid,school_name,issue_type,urgency,school_deadline,essentials_requested,essentials_term,verified_at,verification_expires_at",
    )
    .eq("verification_token_hash", verificationHash)
    .maybeSingle();

  if (!record) {
    return NextResponse.redirect(
      new URL(
        "/help-desk/access?error=This+verification+link+is+invalid+or+has+already+been+replaced.",
        request.url,
      ),
    );
  }
  if (
    !record.verified_at &&
    (!record.verification_expires_at ||
      new Date(record.verification_expires_at) < new Date())
  ) {
    return NextResponse.redirect(
      new URL(
        `/help-desk/access?expired=1&caseNumber=${encodeURIComponent(record.case_code)}`,
        request.url,
      ),
    );
  }

  const now = new Date();
  const needsEffReview =
    Boolean(record.essentials_requested) ||
    record.urgency.includes("72 hours") ||
    !record.college_unitid;

  if (!record.verified_at) {
    const updated = await admin
      .from("student_help_cases")
      .update({
        verified_at: now.toISOString(),
        status: needsEffReview ? "new" : "referred_to_school",
        next_follow_up_at: new Date(now.getTime() + 3 * 86400000).toISOString(),
        verification_token_hash: null,
        updated_at: now.toISOString(),
      })
      .eq("id", record.id);
    if (updated.error) {
      return NextResponse.redirect(
        new URL(
          "/help-desk/open-case?error=We+could+not+verify+your+case.+Please+contact+EFF.",
          request.url,
        ),
      );
    }
  }

  const rawAccessToken = randomBytes(32).toString("base64url");
  await admin.from("help_desk_case_access_tokens").insert({
    case_id: record.id,
    token_hash: createHash("sha256").update(rawAccessToken).digest("hex"),
    requested_email: record.email,
    expires_at: new Date(Date.now() + 30 * 60000).toISOString(),
  });
  const caseUrl = new URL(
    `/help-desk/cases/${encodeURIComponent(record.case_code)}`,
    request.url,
  );
  caseUrl.searchParams.set("access", rawAccessToken);

  const [{data: school}, {data: contactRows}] = await Promise.all([
    record.college_unitid
      ? admin
          .from("college_directory")
          .select(
            "website,admissions_url,financial_aid_url,accessibility_url,veterans_url",
          )
          .eq("unitid", record.college_unitid)
          .maybeSingle()
      : Promise.resolve({data: null}),
    record.college_unitid
      ? admin
          .from("college_contact_directory")
          .select(
            "department_key,department_name,contact_url,email,phone,source_url",
          )
          .eq("unitid", record.college_unitid)
          .in("department_key", contactKeysForIssue(record.issue_type))
          .in("verification_status", ["source_listed", "verified"])
      : Promise.resolve({data: []}),
  ]);
  const routing = buildAutomaticStudentRouting(
    record,
    (contactRows ?? []) as SchoolContact[],
    school ?? {},
  );
  await admin.from("student_help_case_events").insert({
    case_id: record.id,
    event_type: "email_verified",
    summary: needsEffReview
      ? "Student verified; secure case access issued and the exception entered EFF review."
      : "Student verified; secure case access and automatic school routing issued.",
  });
  await admin.from("student_help_case_messages").insert({
    case_id: record.id,
    author_type: "system",
    author_name: "EFF National Help Desk",
    body:
      "Your email is verified. Your Help Desk case is active. Review the resource path and keep this case updated when a deadline, school response, or next step changes.",
  });

  try {
    const name = escapeHtml(record.preferred_name || record.student_name);
    const sends = [
      getResend().emails.send({
        from: emailFrom,
        to: record.email,
        replyTo: "nationals@estherfundsinc.org",
        subject: "Verify Your EFF National Help Desk Case",
        html: `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#2d1748;max-width:680px;margin:auto"><div style="background:#42127f;color:#fff;padding:26px"><strong>EFF NATIONAL STUDENT HELP DESK</strong><h1 style="margin:8px 0 0">Your case is verified</h1></div><div style="padding:28px;border:1px solid #decff0"><p>Hello ${name},</p><p>Case <strong>${record.case_code}</strong> is active. Use the secure button below to enter your Help Desk case, view messages, resources, and next steps, and add an update.</p><p><a href="${caseUrl}" style="display:inline-block;background:#42127f;color:#fff;padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:700">Enter My Help Desk Case</a></p><p>This secure link expires in 30 minutes. You can request a new one at any time from <strong>Access My Case</strong>.</p><pre style="white-space:pre-wrap;background:#f5f0e6;padding:18px">${escapeHtml(routing)}</pre><p>Do not email passwords, Social Security numbers, tax returns, bank details, verification codes, or unredacted IDs.</p><p>Esther Funds Foundation<br><em>Every Future Fulfilled.</em></p></div></div>`,
        text: `Your EFF National Student Help Desk case ${record.case_code} is verified.\n\nSecure case access (expires in 30 minutes): ${caseUrl}\n\n${routing}`,
      }),
    ];
    if (needsEffReview) {
      sends.push(
        getResend().emails.send({
          from: emailFrom,
          to: "nationals@estherfundsinc.org",
          replyTo: record.email,
          subject: "Help Desk Case Requires Supervisor Review",
          text: `A verified National Student Help Desk exception requires authorized review.\n\nCase: ${record.case_code}\nSchool: ${record.school_name}\nTopic: ${record.issue_type}\n\nReview inside Help Desk Administration:\nhttps://portal.estherfundsfoundation.org/help-desk/admin\n\nDo not request sensitive records by ordinary email.`,
        }),
      );
    }
    await Promise.all(sends);
  } catch (error) {
    console.error("National Help Desk confirmation delivery failed", error);
  }

  return NextResponse.redirect(caseUrl);
}
