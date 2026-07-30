import type {Metadata} from "next";
import Link from "next/link";
import {AlertTriangle, HeartHandshake, ShieldAlert} from "lucide-react";

export const metadata: Metadata = {title: "Help Desk Safety and Emergency Guidance"};

export default function HelpDeskSafety() {
  return <main className="section white"><div className="shell" style={{maxWidth:900}}><div className="eyebrow">Know where to turn</div><h1>Safety and Emergency Guidance</h1><div className="help-desk-safety-grid"><article className="card"><AlertTriangle/><h2>Immediate physical danger</h2><p>Call 911 or local emergency services. The National Student Help Desk is not an emergency response service.</p></article><article className="card"><ShieldAlert/><h2>Suicide, self-harm, or emotional crisis</h2><p>Call or text 988 in the United States for trained crisis support.</p></article><article className="card"><HeartHandshake/><h2>Food, housing, and essential needs</h2><p>Call 211 for local resource navigation, then open a Help Desk case if you want EFF support organizing your campus next steps.</p></article></div><div className="hero-actions"><Link className="button" href="/help-desk/open-case">Open a non-emergency Help Desk case</Link><Link className="button outline" href="/help-desk">Return to the National Help Desk</Link></div></div></main>;
}
