import type {Metadata} from "next";
import Image from "next/image";
import Link from "next/link";
import {ExternalLink, Mail} from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: {default: "Esther Funds Foundation Portal", template: "%s | Esther Funds Foundation Portal"},
  description: "Scholarships, grants, emergency resources, student support, and leadership training from Esther Funds Foundation.",
  icons: {icon: "/brand/eff-logo.png"},
};

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <div className="utility">
          <div className="shell">
            <a href="https://www.estherfundsfoundation.org" target="_blank" rel="noopener noreferrer">Visit estherfundsfoundation.org <ExternalLink size={13}/></a>
            <a href="mailto:nationals@estherfundsinc.org"><Mail size={13}/> Questions? Email our national team</a>
          </div>
        </div>
        <header className="nav">
          <div className="shell nav-inner">
            <Link className="brand" href="/">
              <Image className="brand-logo" src="/brand/eff-logo.png" alt="Esther Funds Foundation — Every Future Fulfilled" width={68} height={68} priority/>
              <span className="brand-copy"><strong>Esther Funds Foundation</strong><small>Portal</small></span>
            </Link>
            <nav className="nav-links" aria-label="Primary">
              <Link href="/help-desk">National Student Help Desk</Link>
              <Link href="/tech-desk">EFF Tech Desk</Link>
              <Link href="/programs">EFF Programs</Link>
              <Link href="/scholarships">Scholarship Directory</Link>
              <Link href="/partners">Partner Schools</Link>
              <Link href="/academy">Leadership Academy</Link>
              <Link className="button" href="/dashboard">Scholarship Applications</Link>
            </nav>
          </div>
        </header>
        <div id="main-content">{children}</div>
        <footer className="footer">
          <div className="shell footer-grid">
            <div>
              <div className="brand">
                <Image className="footer-logo" src="/brand/eff-logo.png" alt="" width={86} height={86}/>
                <span className="brand-copy"><strong>Esther Funds Foundation</strong><small>Portal</small></span>
              </div>
              <p>We are working to prevent college dropouts around the world.</p>
              <small>© {new Date().getFullYear()} Esther Funds Foundation</small>
            </div>
            <div>
              <strong>Explore</strong>
              <p>
                <Link href="/help-desk">National Student Help Desk</Link><br/>
                <Link href="/tech-desk">EFF Tech Desk</Link><br/>
                <Link href="/programs">EFF programs</Link><br/>
                <Link href="/scholarships">Scholarship directory</Link><br/>
                <Link href="/partners">College Continuity Partners</Link><br/>
                <Link href="/academy">Leadership Training Academy</Link><br/>
                <Link href="/dashboard">Applicant portal</Link><br/>
                <a href="https://www.estherfundsfoundation.org" target="_blank" rel="noopener noreferrer">Foundation website</a>
              </p>
            </div>
            <div>
              <strong>Need help?</strong>
              <p><a href="mailto:nationals@estherfundsinc.org">nationals@estherfundsinc.org</a></p>
              <p>
                <Link href="/account-help">Account help</Link><br/>
                <Link href="/accessibility">Accessibility</Link><br/>
                <Link href="/privacy">Privacy</Link><br/>
                <Link href="/student-policies">Student policies</Link>
              </p>
              <p><Link className="staff-access-link" href="/admin">Staff Access → Admin Dashboard</Link></p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
