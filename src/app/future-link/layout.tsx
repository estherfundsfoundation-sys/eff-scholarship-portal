import "./future-link.css";
import Image from "next/image";
import Link from "next/link";

export default function FutureLinkLayout({children}:{children:React.ReactNode}){
  return <div className="fl-site-shell">
    <header className="fl-site-nav"><Link href="/" className="fl-site-brand"><Image src="/brand/eff-logo.png" alt="Esther Funds Foundation" width={54} height={54}/><span><strong>EFF FutureLink</strong><small>Mentorship that moves students forward.</small></span></Link><nav aria-label="FutureLink"><Link href="/apply?path=mentee">Find My Mentor</Link><Link href="/apply?path=mentor">Become a Mentor</Link><Link href="/dashboard">My FutureLink</Link></nav></header>
    {children}
    <footer className="fl-site-footer"><div><strong>EFF FutureLink</strong><span>A mentorship initiative of Esther Funds Foundation.</span></div><div><Link href="/apply?path=mentee">Find My Mentor</Link><Link href="/apply?path=mentor">Become a Mentor</Link><a href="mailto:info@estherfundsfoundation.org">Contact EFF</a></div></footer>
  </div>;
}
