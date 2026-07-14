import type {Metadata} from "next";
import Image from "next/image";
import Link from "next/link";
import {ExternalLink, Mail} from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {title: {default: "Esther Funds Foundation Scholarship Portal", template: "%s | EFF Scholarship Portal"}, description: "Scholarships, grants, and trusted opportunities from Esther Funds Foundation.", icons: {icon: "/brand/eff-logo.png"}};

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>
    <div className="utility"><div className="shell"><a href="https://www.estherfundsfoundation.org" target="_blank" rel="noopener noreferrer">Visit estherfundsfoundation.org <ExternalLink size={13}/></a><a href="mailto:nationals@estherfundsinc.org"><Mail size={13}/> Questions? Email our national team</a></div></div>
    <header className="nav"><div className="shell nav-inner"><Link className="brand" href="/"><Image className="brand-logo" src="/brand/eff-logo.png" alt="Esther Funds Foundation — Every Future Fulfilled" width={68} height={68} priority/><span className="brand-copy"><strong>Esther Funds Foundation</strong><small>Scholarship Portal</small></span></Link><nav className="nav-links" aria-label="Primary"><Link href="/programs">EFF Programs</Link><Link href="/scholarships">Scholarship Directory</Link><Link href="/sign-in">Sign in</Link><Link className="button" href="/dashboard">My portal</Link></nav></div></header>
    {children}
    <footer className="footer"><div className="shell footer-grid"><div><div className="brand"><Image className="footer-logo" src="/brand/eff-logo.png" alt="" width={86} height={86}/><span className="brand-copy"><strong>Esther Funds Foundation</strong><small>Scholarship Portal</small></span></div><p>Real. Raw. Relevant. Helping students meet the moment with dignity, faith, and hope.</p><small>© {new Date().getFullYear()} Esther Funds Foundation</small></div><div><strong>Explore</strong><p><Link href="/programs">EFF programs</Link><br/><Link href="/scholarships">Scholarship directory</Link><br/><Link href="/dashboard">Applicant portal</Link><br/><a href="https://www.estherfundsfoundation.org" target="_blank" rel="noopener noreferrer">Foundation website</a></p></div><div><strong>Need help?</strong><p><a href="mailto:nationals@estherfundsinc.org">nationals@estherfundsinc.org</a></p><p><Link href="/accessibility">Accessibility</Link><br/><Link href="/privacy">Privacy</Link></p></div></div></footer>
  </body></html>;
}
