import type {Metadata} from "next";
import Image from "next/image";
import Link from "next/link";
import {ArrowRight, MessageCircle} from "lucide-react";
import "./beyond.css";
import "./beyond-groupme.css";

export const metadata:Metadata={title:{absolute:"EFF Beyond | Community After College"},description:"Community, career support, mentorship, faith, and practical life guidance for what comes after college."};

export default function BeyondLayout({children}:{children:React.ReactNode}){
  return <div className="beyond-site">
    <header className="beyond-nav"><Link className="beyond-brand" href="/beyond"><Image src="/brand/eff-logo.png" alt="Esther Funds Foundation" width={48} height={48}/><span><b>EFF</b> BEYOND</span></Link><nav aria-label="Beyond"><Link href="/beyond/explore">Explore</Link><Link href="/beyond/people">People</Link><Link href="/beyond/dashboard">My Beyond</Link><Link className="beyond-nav-cta" href="/beyond/join">Join Beyond</Link></nav></header>
    <a className="beyond-community-bar" href="https://groupme.com/join_group/117295571/z5lprYGT" target="_blank" rel="noopener noreferrer"><MessageCircle/><span><strong>THE COMMUNITY IS OPEN</strong> Join the official EFF Beyond groupchat</span><ArrowRight/></a>
    {children}
    <footer className="beyond-footer"><div><span className="beyond-wordmark">EFF BEYOND</span><p>A community for what comes after college.</p></div><div><Link href="/beyond/explore">Explore the community</Link><Link href="/beyond/join">Become a member</Link><a href="mailto:info@estherfundsfoundation.org">Contact EFF</a></div><small>© {new Date().getFullYear()} Esther Funds Foundation · Every Future Fulfilled.</small></footer>
  </div>;
}
