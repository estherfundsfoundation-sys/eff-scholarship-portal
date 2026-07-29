import Link from "next/link";
import {MessagesSquare, ShieldCheck, Users} from "lucide-react";
import "../../help-desk/help-desk.css";

export default function StudentHelpAdminLayout({children}:{children:React.ReactNode}) {
  return <><div className="help-desk-admin-nav"><div className="shell"><Link href="/admin/student-help">Cases and school outreach</Link><Link href="/admin/student-help/conversations"><MessagesSquare/> Conversations and transcripts</Link><Link href="/admin/student-help/volunteers"><Users/> Volunteers and service</Link><Link href="/help-desk" target="_blank"><ShieldCheck/> Public Help Desk ↗</Link></div></div>{children}</>;
}
