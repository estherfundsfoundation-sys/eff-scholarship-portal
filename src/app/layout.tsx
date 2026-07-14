import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = { title: "EFF Scholarship Portal", description: "Scholarships and grants from Esther Funds Foundation, plus trusted external opportunities." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><header className="nav"><div className="shell nav-inner"><Link className="brand" href="/"><span className="brand-mark">EFF</span><span>Esther Funds Foundation</span></Link><nav className="nav-links" aria-label="Primary"><Link href="/programs">EFF Programs</Link><Link href="/scholarships">Scholarship Directory</Link><Link href="/sign-in">Sign in</Link><Link className="button light" href="/dashboard">My portal</Link></nav></div></header>{children}<footer className="footer"><div className="shell footer-grid"><div><div className="brand"><span className="brand-mark"><Heart size={19}/></span><span>Esther Funds Foundation</span></div><p>Helping students meet the moment with practical support, dignity, and hope.</p><small>© {new Date().getFullYear()} Esther Funds Foundation</small></div><div><strong>Explore</strong><p><Link href="/programs">EFF programs</Link><br/><Link href="/scholarships">External directory</Link><br/><Link href="/dashboard">Applicant portal</Link></p></div><div><strong>Support</strong><p><Link href="/accessibility">Accessibility</Link><br/><Link href="/privacy">Privacy</Link><br/><Link href="/contact">Contact</Link></p></div></div></footer></body></html>;
}
