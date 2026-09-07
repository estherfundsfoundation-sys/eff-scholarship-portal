import Link from "next/link";
import {ArrowRight, MessageCircleQuestion} from "lucide-react";
import {isAskEffEnabled} from "@/lib/ask-eff/config";
import styles from "./AskEffHomeCard.module.css";

export default function AskEffHomeCard() {
  if (!isAskEffEnabled()) return null;
  return <section className={styles.section} aria-labelledby="ask-eff-home-title"><div className={styles.card}><div className={styles.icon}><MessageCircleQuestion aria-hidden="true"/></div><div><p>EFF EDUCATION ASSISTANT</p><h2 id="ask-eff-home-title">Ask us a question.</h2><span>College can be complicated. Finding your next step shouldn’t be.</span></div><Link href="/ask">Ask EFF <ArrowRight size={18}/></Link></div></section>;
}
