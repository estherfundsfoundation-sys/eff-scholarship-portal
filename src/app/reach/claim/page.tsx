import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {connectReachAmbassadorAccount, requestReachClaimLink} from "./actions";

export default async function ReachClaimPage({
  searchParams,
}: {
  searchParams: Promise<{token?: string; sent?: string; error?: string}>;
}) {
  const query = await searchParams;
  const token = String(query.token ?? "").trim();
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user?.email) {
    return <main className="section white"><div className="shell" style={{maxWidth:760}}>
      <div className="card">
        <div className="eyebrow">REACH Ambassador account</div>
        <h2>Claim your secure ambassador workspace</h2>
        {query.error && <div className="notice error-text" role="alert">{query.error}</div>}
        {query.sent && <div className="notice" role="status"><strong>Check the inbox that received your REACH invitation.</strong><br/>If the address is on the active ambassador roster, a private link is on its way. Use only the newest message.</div>}
        {token ? <>
          <p>Your private invitation link is ready. You may use any personal, school, or other email address you control for your EFF Portal account.</p>
          <div className="form-actions">
            <Link className="button" href={`/sign-up?next=${encodeURIComponent(`/reach/claim?token=${token}`)}`}>Create my account with any email</Link>
            <Link className="button outline" href={`/sign-in?next=${encodeURIComponent(`/reach/claim?token=${token}`)}`}>Use my existing portal account</Link>
          </div>
        </> : <>
          <p>Enter the email address where EFF sent your ambassador invitation. We will send a private link that lets you connect the invitation to <strong>any email address you control</strong>.</p>
          <form action={requestReachClaimLink} className="stack" style={{marginTop:24}}>
            <label>Invitation email address<input name="invitationEmail" type="email" autoComplete="email" required/></label>
            <button className="button">Send my secure claim link</button>
          </form>
          <p className="muted">Already connected your account? <Link className="card-link" href="/sign-in?next=%2Freach%2Fambassador">Sign in here</Link>.</p>
        </>}
        <p className="muted">Never forward a private claim link or share your password or verification code.</p>
      </div>
    </div></main>;
  }

  const admin = createAdminClient();
  const normalizedEmail = user.email.trim().toLowerCase();
  const [{data: connected}, {data: exactEmail}] = await Promise.all([
    admin.from("reach_ambassadors").select("id,active").eq("user_id", user.id).maybeSingle(),
    admin.from("reach_ambassadors").select("id,user_id,active").eq("email", normalizedEmail).maybeSingle(),
  ]);
  if (connected?.active || (exactEmail?.active && (!exactEmail.user_id || exactEmail.user_id === user.id))) {
    redirect("/reach/ambassador");
  }

  return <main className="section white"><div className="shell" style={{maxWidth:760}}>
    <div className="card">
      <div className="eyebrow">Account verification</div>
      <h2>{token ? "Connect this invitation to your signed-in account" : "Connect an invitation sent to another email"}</h2>
      {query.error && <div className="notice error-text" role="alert">{query.error}</div>}
      {query.sent && <div className="notice" role="status"><strong>Check the inbox that received your REACH invitation.</strong><br/>If the address is on the active roster, a private link is on its way.</div>}
      {token ? <>
        <p>You are signed in as <strong>{normalizedEmail}</strong>. Choose the button below to connect this verified portal account to your approved REACH Ambassador record.</p>
        <form action={connectReachAmbassadorAccount}>
          <input type="hidden" name="token" value={token}/>
          <button className="button">Connect my ambassador account</button>
        </form>
      </> : <>
        <p>You are signed in as <strong>{normalizedEmail}</strong>. Enter the email address where EFF sent your REACH invitation. The private link we send will let you connect that invitation to this account.</p>
        <form action={requestReachClaimLink} className="stack" style={{marginTop:24}}>
          <label>Invitation email address<input name="invitationEmail" type="email" autoComplete="email" required/></label>
          <button className="button">Send my secure claim link</button>
        </form>
      </>}
      <p className="muted">If your original invitation email was entered incorrectly, contact <a className="card-link" href="mailto:nationals@estherfundsinc.org">nationals@estherfundsinc.org</a>. Never send a password or verification code.</p>
      <Link className="button outline" href="/dashboard">Return to dashboard</Link>
    </div>
  </div></main>;
}

