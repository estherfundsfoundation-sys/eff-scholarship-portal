import type {Metadata} from "next";
import Image from "next/image";
import Link from "next/link";
import {ExternalLink, LifeBuoy, LockKeyhole, ShieldCheck} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import "./help-desk.css";

export const metadata: Metadata = {
  title: {
    default: "National Student Help Desk | Esther Funds Foundation",
    template: "%s | Esther Funds Foundation",
  },
  description:
    "Secure student-support cases, resource navigation, advocacy preparation, and accountable follow-up from Esther Funds Foundation.",
};

async function workspaceLinks() {
  try {
    const supabase = await createClient();
    const {
      data: {user},
    } = await supabase.auth.getUser();
    if (!user) return [];
    const admin = createAdminClient();
    const [{data: cases}, {data: volunteer}, {data: staff}, {data: scholarship}] =
      await Promise.all([
        admin
          .from("student_help_cases")
          .select("id,status")
          .eq("user_id", user.id)
          .not("status", "in", "(resolved,closed)")
          .limit(5),
        admin
          .from("help_desk_volunteer_profiles")
          .select("status,training_score")
          .eq("user_id", user.id)
          .maybeSingle(),
        admin
          .from("help_desk_staff_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("active", true)
          .limit(5),
        admin.from("profiles").select("id").eq("id", user.id).maybeSingle(),
      ]);
    return [
      cases?.length
        ? {
            href: "/help-desk/access",
            label: "National Student Help Desk",
            detail: `${cases.length} open case${cases.length === 1 ? "" : "s"}`,
          }
        : null,
      volunteer
        ? {
            href:
              volunteer.status === "active"
                ? "/help-desk/volunteer/console"
                : "/help-desk/volunteer/onboarding",
            label: "Help Desk Volunteer Console",
            detail:
              volunteer.status === "active"
                ? "Active volunteer"
                : volunteer.status.replaceAll("_", " "),
          }
        : null,
      staff?.length
        ? {
            href: "/help-desk/admin",
            label: "Help Desk Administration",
            detail: staff[0].role.replaceAll("_", " "),
          }
        : null,
      scholarship
        ? {
            href: "/dashboard",
            label: "EFF Scholarship Portal",
            detail: "Scholarship applicant",
          }
        : null,
    ].filter(Boolean) as Array<{href: string; label: string; detail: string}>;
  } catch {
    return [];
  }
}

export default async function HelpDeskLayout({children}: {children: React.ReactNode}) {
  const workspaces = await workspaceLinks();
  return (
    <div className="help-desk-shell">
      <div className="help-desk-privacy">
        <div className="shell">
          <span><ShieldCheck size={15}/> Private, consent-based student support</span>
          <Link href="/help-desk/safety">Safety and emergency guidance</Link>
        </div>
      </div>
      <header className="help-desk-header">
        <div className="shell help-desk-header-inner">
          <Link className="help-desk-brand" href="/help-desk">
            <Image
              src="/brand/eff-logo.png"
              width={62}
              height={62}
              alt="Esther Funds Foundation"
              priority
            />
            <span>
              <strong>EFF NATIONAL STUDENT HELP DESK</strong>
              <small>Every Future Fulfilled.</small>
            </span>
          </Link>
          <nav aria-label="National Student Help Desk">
            <Link href="/help-desk">National Help Desk</Link>
            <Link href="/help-desk/open-case">Open a Secure Case</Link>
            <Link href="/help-desk/access">Access My Case</Link>
            <Link href="/help-desk/resources">Student Resources</Link>
            <Link href="/help-desk/volunteer">Volunteer</Link>
          </nav>
        </div>
        {workspaces.length > 1 && (
          <details className="help-desk-switcher shell">
            <summary>Choose Your EFF Workspace</summary>
            <div>
              {workspaces.map((workspace) => (
                <Link href={workspace.href} key={workspace.href}>
                  <strong>{workspace.label}</strong>
                  <small>{workspace.detail}</small>
                </Link>
              ))}
            </div>
          </details>
        )}
      </header>
      {children}
      <footer className="help-desk-footer">
        <div className="shell help-desk-footer-grid">
          <div>
            <strong>EFF NATIONAL STUDENT HELP DESK</strong>
            <p>Listening, navigation, advocacy preparation, resources, and follow-up for college students nationwide.</p>
            <small>Every Future Fulfilled.</small>
          </div>
          <div>
            <strong>Secure access</strong>
            <p><Link href="/help-desk/access"><LockKeyhole size={14}/> Access My Case</Link></p>
            <p><Link href="/help-desk/account-help"><LifeBuoy size={14}/> Help With Access</Link></p>
          </div>
          <div>
            <strong>Other EFF systems</strong>
            <p><Link href="/">EFF Scholarship Portal</Link></p>
            <p><a href="https://my.estherfundsfoundation.org">MyEFF <ExternalLink size={13}/></a></p>
            <p><Link href="/help-desk/staff/sign-in">Help Desk Staff Access</Link></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
