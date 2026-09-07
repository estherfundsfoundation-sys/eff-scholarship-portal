import type {Metadata} from "next";
import Link from "next/link";
import {ArrowLeft, LockKeyhole} from "lucide-react";
import {getAskEffConfig} from "@/lib/ask-eff/config";
import AskEffClient from "./AskEffClient";
import styles from "./ask.module.css";

export const metadata: Metadata = {
  title: "Ask EFF",
  description: "A conversational education-navigation assistant from Esther Funds Foundation.",
  robots: {index: false, follow: false},
};

export default function AskEffPage() {
  const config = getAskEffConfig();
  if (!config.enabled) {
    return <main className={styles.page}><section className={styles.unavailable}><LockKeyhole aria-hidden="true"/><p className={styles.kicker}>ASK EFF</p><h1>Ask EFF is preparing for its pilot.</h1><p>The AI assistant is currently disabled. Every existing EFF resource remains available.</p><Link className={styles.primaryLink} href="/resources">Open Student Resources</Link><Link className={styles.textLink} href="/"><ArrowLeft size={16}/> Back to the portal</Link></section></main>;
  }
  return <AskEffClient pilotOnly={config.pilotOnly} requiresPilotCode={config.pilotOnly && Boolean(config.pilotAccessCode)} />;
}

