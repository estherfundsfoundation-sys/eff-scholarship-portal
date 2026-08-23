import type {Metadata} from "next";
import Link from "next/link";
import ApplyAllDemo from "./applyall-demo";

export const metadata: Metadata = {title:"EFF Apply Everywhere",description:"Start here. Go anywhere. Build and organize supported college applications with Esther Funds Foundation."};

export default function ApplyEverywherePage(){return <main className="applyall"><section className="applyall-workspace"><div className="shell"><span className="applyall-kicker">EFF Apply Everywhere</span><h1>One application. More possibilities.</h1><p className="applyall-lead">Complete one EFF admissions application and send it to verified participating colleges you choose. EFF records delivery so students and colleges share one clear receipt.</p><div className="hero-actions"><Link className="button" href="/apply-everywhere/start">Start my application</Link><Link className="button outline" href="/apply-everywhere/colleges">For colleges</Link></div><p className="applyall-fine">Applications can be delivered only to institutions that have completed EFF verification and agreed to receive them.</p></div></section><ApplyAllDemo/></main>}
