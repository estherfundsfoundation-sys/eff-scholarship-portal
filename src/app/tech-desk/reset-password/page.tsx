import type {Metadata} from "next";
import {updateTechDeskStaffPassword} from "@/app/tech-desk/actions";

export const metadata: Metadata = {title: "Create a New Tech Desk Password"};

export default async function TechDeskResetPassword({
  searchParams,
}: {
  searchParams: Promise<{error?: string}>;
}) {
  const query = await searchParams;
  return (
    <main className="section">
      <div className="shell" style={{maxWidth: 620}}>
        <section className="card">
          <div className="eyebrow">Secure EFF identity</div>
          <h1>Create a New Tech Desk Staff Password</h1>
          <p>
            Use at least 10 characters. Your Tech Desk role and records remain
            separate from other EFF products.
          </p>
          {query.error && <div className="notice" role="alert">{query.error}</div>}
          <form action={updateTechDeskStaffPassword} className="stack">
            <label>
              New password
              <input
                name="password"
                type="password"
                minLength={10}
                required
                autoComplete="new-password"
              />
            </label>
            <button className="button">Update Password</button>
          </form>
        </section>
      </div>
    </main>
  );
}
