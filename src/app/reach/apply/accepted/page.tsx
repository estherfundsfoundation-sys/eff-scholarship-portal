import Link from "next/link";
import {CheckCircle2, Download, MessageCircle, Palette, ShieldCheck} from "lucide-react";

export const metadata = {title: "Welcome to REACH"};

export default async function ReachApplicationAcceptedPage({
  searchParams,
}: {
  searchParams: Promise<{name?: string; email?: string; sent?: string}>;
}) {
  const query = await searchParams;
  const name = query.name?.slice(0, 80) || "Ambassador";
  const email = query.email?.slice(0, 180) || "your email";
  return <main className="section white"><div className="shell" style={{maxWidth:860}}>
    <div className="case-submitted-confirmation">
      <CheckCircle2/>
      <div>
        <div className="eyebrow">You’re officially a REACH Campus Ambassador</div>
        <h2>Welcome, {name}!</h2>
        <p>Your application was accepted and your secure ambassador record is ready.</p>
        {query.sent === "1"
          ? <div className="notice"><strong>Check {email}.</strong> Your acceptance email includes the official PDF letter and every next-step link.</div>
          : <div className="notice"><strong>Your record is ready, but the email could not be delivered.</strong> Use the links below now and contact nationals@estherfundsinc.org if you need the attached letter resent.</div>}
      </div>
    </div>
    <div className="cards" style={{marginTop:28}}>
      <div className="card"><ShieldCheck/><h3>Claim your account</h3><p>Use the same email address you entered in your application.</p><Link className="button" href="/sign-up?next=%2Freach%2Fclaim">Create my account</Link></div>
      <div className="card"><MessageCircle/><h3>Join the GroupMe</h3><p>Meet the ambassador community and receive official program updates.</p><a className="button outline" href="https://groupme.com/join_group/115383772/RY1wMSj8" target="_blank" rel="noopener noreferrer">Join GroupMe</a></div>
      <div className="card"><Palette/><h3>Introduction template</h3><p>Customize the approved Canva design, then share it from your personal account.</p><a className="button outline" href="https://canva.link/ylmn6n7bgocjlcp" target="_blank" rel="noopener noreferrer">Open Canva template</a></div>
    </div>
    <div className="notice" style={{marginTop:28}}><Download/><div><strong>Your acceptance letter is attached to your welcome email.</strong><br/>After you claim your account, you can also download it from your private workspace.</div></div>
  </div></main>;
}
