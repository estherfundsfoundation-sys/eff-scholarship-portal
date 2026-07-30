import type {Metadata} from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ExternalLink,
  Headphones,
  LockKeyhole,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import "./tech-desk.css";

export const metadata: Metadata = {
  title: {
    default: "EFF Tech Desk | Esther Funds Foundation",
    template: "%s | EFF Tech Desk",
  },
  description:
    "Secure technical support, automated diagnostics, platform status, account recovery, and accountable follow-up for Esther Funds Foundation systems.",
};

export default function TechDeskLayout({children}: {children: React.ReactNode}) {
  return (
    <div className="tech-desk-shell">
      <div className="tech-desk-trust">
        <div className="shell">
          <span><ShieldCheck size={15}/> Secure support for official EFF platforms</span>
          <span>Never send passwords, verification codes, or private API keys.</span>
        </div>
      </div>
      <header className="tech-desk-header">
        <div className="shell tech-desk-header-inner">
          <Link className="tech-desk-brand" href="/tech-desk">
            <Image
              src="/brand/eff-logo.png"
              width={58}
              height={58}
              alt="Esther Funds Foundation"
              priority
            />
            <span>
              <strong>EFF TECH DESK</strong>
              <small>Every Future Fulfilled.</small>
            </span>
          </Link>
          <nav aria-label="EFF Tech Desk">
            <Link href="/tech-desk">Tech Desk</Link>
            <Link href="/tech-desk/open-ticket">Open a Ticket</Link>
            <Link href="/tech-desk/access">Access My Ticket</Link>
            <Link href="/tech-desk/status"><Activity size={15}/> Platform Status</Link>
            <Link href="/tech-desk/knowledge">Help Library</Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="tech-desk-footer">
        <div className="shell tech-desk-footer-grid">
          <div>
            <strong>EFF TECH DESK</strong>
            <p>Technical support, safe diagnostics, clear communication, and accountable resolution across EFF platforms.</p>
            <small>Every Future Fulfilled.</small>
          </div>
          <div>
            <strong>Ticket support</strong>
            <p><Link href="/tech-desk/open-ticket"><Headphones size={14}/> Open a Ticket</Link></p>
            <p><Link href="/tech-desk/access"><LockKeyhole size={14}/> Access My Ticket</Link></p>
            <p><Link href="/tech-desk/status"><Activity size={14}/> Platform Status</Link></p>
          </div>
          <div>
            <strong>Other EFF support</strong>
            <p><Link href="/help-desk">National Student Help Desk</Link></p>
            <p><Link href="/">Scholarship Portal</Link></p>
            <p><a href="https://my.estherfundsfoundation.org">MyEFF <ExternalLink size={13}/></a></p>
            <p><Link href="/tech-desk/staff/sign-in"><Wrench size={14}/> Tech Desk Staff</Link></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
