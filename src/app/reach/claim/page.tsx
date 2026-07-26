import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";

export default async function ReachClaimPage() {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user?.email) {
    return <main className="section white"><div className="shell" style={{maxWidth:760}}>
      <div className="card">
        <div className="eyebrow">REACH Ambassador account</div>
        <h2>Claim your secure ambassador workspace</h2>
        <p>Use the same email address where you received your REACH Ambassador invitation. After you verify it, your approved ambassador record will connect automatically.</p>
        <div className="form-actions">
          <Link className="button" href="/sign-up?next=%2Freach%2Fclaim">Create my account</Link>
          <Link className="button outline" href="/sign-in?next=%2Freach%2Fclaim">I already have an account</Link>
        </div>
        <p className="muted">Never share your password or verification code. If your invitation went to a different email, contact nationals@estherfundsinc.org.</p>
      </div>
    </div></main>;
  }

  const admin = createAdminClient();
  const {data: ambassador} = await admin.from("reach_ambassadors")
    .select("id,user_id,active")
    .eq("email", user.email.trim().toLowerCase())
    .maybeSingle();
  if (!ambassador?.active || (ambassador.user_id && ambassador.user_id !== user.id)) {
    return <main className="section white"><div className="shell" style={{maxWidth:760}}>
      <div className="card">
        <div className="eyebrow">Account verification</div>
        <h2>We could not match this email to an active ambassador invitation.</h2>
        <p>Please sign out and use the exact email address where EFF sent your REACH invitation. If the address needs to be updated, email nationals@estherfundsinc.org.</p>
        <Link className="button outline" href="/dashboard">Return to dashboard</Link>
      </div>
    </div></main>;
  }
  redirect("/reach/ambassador");
}

