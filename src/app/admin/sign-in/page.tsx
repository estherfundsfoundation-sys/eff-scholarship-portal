import type {Metadata} from "next";
import Link from "next/link";
import {
  requestStaffLoginCode,
  verifyStaffLoginCode,
} from "./actions";
import {safeStaffDestination} from "@/lib/staff-access";

export const metadata: Metadata = {
  title: "Scholarship Administration Staff Access",
};

type Query = {
  error?: string;
  sent?: string;
  limited?: string;
  denied?: string;
  next?: string;
};

export default async function StaffSignIn({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const query = await searchParams;
  const next = safeStaffDestination(query.next);

  return (
    <main className="section">
      <div className="shell" style={{maxWidth: 720}}>
        <div className="card">
          <div className="eyebrow">Restricted scholarship workspace</div>
          <h1>Scholarship Administration Staff Access</h1>
          <p className="muted">
            Authorized reviewers, finance staff, program administrators, and
            super administrators sign in with an email verification code.
          </p>

          {query.error && (
            <div className="notice error-text" role="alert">
              {query.error}
            </div>
          )}
          {query.sent && (
            <div className="notice" role="status">
              If that email has active Scholarship Administration access, a
              one-time code is on its way. Check spam and use only the newest
              email.
            </div>
          )}
          {query.limited && (
            <div className="notice" role="alert">
              Too many code requests were made recently. Wait a few minutes
              before requesting another code.
            </div>
          )}
          {query.denied && (
            <div className="notice error-text" role="alert">
              The verified account does not have an active Scholarship
              Administration role. Contact the National Office.
            </div>
          )}

          <section style={{marginTop: 24}}>
            <h2>1. Request a code</h2>
            <form action={requestStaffLoginCode} className="stack">
              <input type="hidden" name="next" value={next} />
              <label>
                Authorized EFF email
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
              <button className="button">Email my one-time code</button>
            </form>
          </section>

          <hr style={{margin: "28px 0"}} />

          <section>
            <h2>2. Enter the newest code</h2>
            <form action={verifyStaffLoginCode} className="stack">
              <input type="hidden" name="next" value={next} />
              <label>
                Authorized EFF email
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                One-time verification code
                <input
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6,8}"
                  minLength={6}
                  maxLength={8}
                  required
                />
              </label>
              <button className="button">Verify and open administration</button>
            </form>
          </section>

          <div className="notice" style={{marginTop: 24}}>
            <strong>Security reminder:</strong> EFF will never ask you to send
            a password, verification code, Supabase service-role key, or Resend
            key by email, text, or support form.
          </div>
          <p className="muted">
            Scholarship applicant?{" "}
            <Link className="card-link" href="/sign-in">
              Use the student password sign-in
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
