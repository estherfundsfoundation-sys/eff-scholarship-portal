import type {Metadata} from "next";
import Link from "next/link";
import ApplyAllDemo from "./applyall-demo";

export const metadata: Metadata = {title:"EFF Apply Everywhere",description:"Start here. Go anywhere. Build and organize supported college applications with Esther Funds Foundation."};

export default function ApplyEverywherePage(){return <main className="applyall"><section className="applyall-workspace"><div className="shell"><span className="applyall-kicker">EFF Apply Everywhere</span><h1>Tell your story once. Go anywhere.</h1><p className="applyall-lead">Build one reusable college profile, organize applications across multiple universities, finish each school&apos;s unique requirements, and track official confirmations in one place.</p><div className="hero-actions"><Link className="button" href="/apply-everywhere/start">Start my application</Link><Link className="button outline" href="/apply-everywhere/colleges">For colleges</Link></div><p className="applyall-fine">Participating colleges may receive applications directly through EFF. For other colleges, EFF guides students to the official application and keeps final review, certification, payment, verification, and submission in the student&apos;s hands.</p></div></section><ApplyAllDemo/></main>}
