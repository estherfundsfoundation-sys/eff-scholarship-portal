import type {Metadata} from "next";
import Link from "next/link";
import {
  BadgeCheck,
  BookOpenCheck,
  CalendarClock,
  HeartHandshake,
  ShieldCheck,
  TimerReset,
} from "lucide-react";

export const metadata: Metadata = {title: "National Help Desk Volunteer"};

export default function HelpDeskVolunteer() {
  return <main><section className="help-desk-volunteer-hero"><div className="shell"><div className="eyebrow">Serve students with care and clarity</div><h1>Become an EFF National Help Desk Volunteer</h1><p>Listen without judgment, help students organize a next step, use verified resources, and escalate anything outside your role.</p><div className="hero-actions"><Link className="button" href="/help-desk/volunteer/create-account">Start Volunteer Onboarding</Link><Link className="button light" href="/help-desk/volunteer/sign-in">Sign In to Volunteer</Link></div></div></section><section className="section white"><div className="shell"><div className="section-head"><div><div className="eyebrow">Before you serve</div><h2>Training and approval are required.</h2></div><p>Every volunteer must complete all modules, earn 100% on the assessment, accept the boundaries, and receive EFF approval before viewing assigned cases.</p></div><div className="help-desk-entry-grid"><article><BookOpenCheck/><h3>Complete training</h3><p>Listening, privacy, boundaries, routing, safety escalation, and quality standards.</p></article><article><BadgeCheck/><h3>Earn 100%</h3><p>Review and retake the assessment until every required concept is correct.</p></article><article><ShieldCheck/><h3>Protect students</h3><p>Access only assigned cases, keep records private, and never promise funding or outcomes.</p></article><article><CalendarClock/><h3>Serve a shift</h3><p>Manage availability, assigned cases, follow-ups, and supervisor support in the volunteer console.</p></article><article><TimerReset/><h3>Verify service hours</h3><p>Submit service activity for supervisor verification and retain a clear service record.</p></article><article><HeartHandshake/><h3>Stay supported</h3><p>Use playbooks, templates, resource libraries, quality coaching, and safety escalation.</p></article></div></div></section></main>;
}
