import type {Metadata} from "next";
import Link from "next/link";
import {safeInternalPath} from "@/lib/security";

export const metadata: Metadata = {
  title: "Continue Securely",
  robots: {index: false, follow: false},
  referrer: "no-referrer",
};

export default async function SecureLink({
  searchParams,
}: {
  searchParams: Promise<{token_hash?: string; type?: string; next?: string}>;
}) {
  const query = await searchParams;
  const tokenHash = String(query.token_hash ?? "");
  const type = String(query.type ?? "");
  const next = safeInternalPath(query.next);
  const valid = tokenHash.length >= 20 && ["signup", "recovery", "magiclink", "email_change", "invite"].includes(type);

  return (
    <main className="section">
      <div className="shell" style={{maxWidth: 620}}>
        <section className="card stack">
          <div className="eyebrow">Protected one-time access</div>
          <h1>Continue to Esther Funds Foundation</h1>
          {valid ? (
            <>
              <p>
                Your email provider may inspect links before delivering them. This extra
                confirmation prevents that safety scan from using your one-time link before you do.
              </p>
              <form action="/auth/confirm" method="post" className="stack">
                <input type="hidden" name="token_hash" value={tokenHash}/>
                <input type="hidden" name="type" value={type}/>
                <input type="hidden" name="next" value={next}/>
                <button className="button" type="submit">Continue Securely</button>
              </form>
              <p className="muted">Use only the newest email. This link is one-time and expires.</p>
            </>
          ) : (
            <div className="notice" role="alert">
              This secure link is incomplete. Request a new email and use only the newest message.
            </div>
          )}
          <Link className="card-link" href="/account-help">Return to account help</Link>
        </section>
      </div>
    </main>
  );
}
