import Link from "next/link";
import {signUp} from "@/app/auth/actions";

export default async function SignUp({searchParams}:{searchParams:Promise<{error?:string;next?:string;claimToken?:string}>}){
  const {error,next,claimToken}=await searchParams;
  const token=claimToken??next?.match(/^\/claim\/([A-Za-z0-9_-]+)$/)?.[1];
  const destination=next??(token?`/claim/${token}`:"/dashboard");
  return <main className="section"><div className="shell" style={{maxWidth:560}}><div className="card">
    <div className="eyebrow">Begin your journey</div><h2>Create an account</h2>
    <p className="muted">{token?"Use the same email address that received your private application invitation.":"Use your own email address. You’ll verify it before accessing applications."}</p>
    {error&&<p className="notice" role="alert">{error}</p>}
    <form action={signUp} style={{display:"grid",gap:16,marginTop:24}}>
      <input type="hidden" name="next" value={destination}/>{token&&<input type="hidden" name="claimToken" value={token}/>} 
      <label>Legal name<input name="legalName" autoComplete="name" required minLength={2} style={{display:"block",width:"100%",padding:12,marginTop:6}}/></label>
      <label>Preferred name <span className="muted">(optional)</span><input name="preferredName" autoComplete="nickname" style={{display:"block",width:"100%",padding:12,marginTop:6}}/></label>
      <label>Email address<input name="email" type="email" autoComplete="email" required style={{display:"block",width:"100%",padding:12,marginTop:6}}/></label>
      <label>Password<input name="password" type="password" autoComplete="new-password" required minLength={10} style={{display:"block",width:"100%",padding:12,marginTop:6}}/><small className="muted">At least 10 characters.</small></label>
      <button className="button">Create secure account</button>
    </form>
    <p className="muted">Already registered? <Link className="card-link" href={`/sign-in?next=${encodeURIComponent(destination)}`}>Sign in</Link></p>
  </div></div></main>
}
