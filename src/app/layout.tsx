import type {Metadata} from "next";
import Image from "next/image";
import Link from "next/link";
import {ExternalLink, Headphones} from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: {default: "Esther Funds Foundation Portal", template: "%s | EFF Portal"},
  description: "Scholarships, grants, emergency resources, student support, volunteer service, and leadership training from Esther Funds Foundation.",
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
            <Link href="/help-desk"><Headphones size={13}/> Contact the National Help Desk</Link>
          </div>
        </div>
        <header className="nav">
          <div className="shell nav-inner">
            <Link className="brand" href="/">
              <Image className="brand-logo" src="/brand/eff-logo.png" alt="Esther Funds Foundation — Every Future Fulfilled" width={68} height={68} priority/>
              <span className="brand-copy"><strong>Esther Funds Foundation</strong><small>National Student Portal</small></span>
            </Link>
            <nav className="nav-links" aria-label="Primary">
              <Link href="/help-desk">National Help Desk</Link>
              <Link href="/programs">EFF Programs</Link>
              <Link href="/scholarships">Scholarship Directory</Link>
              <Link href="/resources">Student Resources</Link>
              <Link href="/academy">Leadership Academy</Link>
              <Link className="button" href="/dashboard">My portal</Link>
            </nav>
          </div>
        </header>
        <div id="main-content">{children}</div>
        <footer className="footer">
          <div className="shell footer-grid">
            <div>
              <div className="brand">
                <Image className="footer-logo" src="/brand/eff-logo.png" alt="" width={86} height={86}/>
                <span className="brand-copy"><strong>Esther Funds Foundation</strong><small>National Student Portal</small></span>
              </div>
              <p>We are working to prevent college dropouts around the world.</p>
              <small>© {new Date().getFullYear()} Esther Funds Foundation</small>
            </div>
            <div>
              <strong>Explore</strong>
              <p>
                <Link href="/help-desk">National Help Desk</Link><br/>
                <Link href="/resources">Student resources</Link><br/>
                <Link href="/programs">EFF programs</Link><br/>
                <Link href="/scholarships">Scholarship directory</Link><br/>
                <Link href="/academy">Leadership Training Academy</Link><br/>
                <Link href="/dashboard">My portal</Link><br/>
                <a href="https://www.estherfundsfoundation.org" target="_blank" rel="noopener noreferrer">Foundation website</a>
              </p>
            </div>
            <div>
              <strong>Help and service</strong>
              <p><Link href="/help-desk">Open or continue a Help Desk case</Link></p>
              <p>
                <Link href="/help-desk/volunteer">Volunteer at the National Help Desk</Link><br/>
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
