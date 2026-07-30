import type {Metadata} from "next";
import Link from "next/link";
import {BookOpenCheck, ShieldCheck} from "lucide-react";
import {createAdminClient} from "@/lib/supabase/admin";

export const metadata: Metadata = {title: "EFF Tech Help Library"};
export const dynamic = "force-dynamic";

export default async function TechDeskKnowledge() {
  const admin = createAdminClient();
  const {data: articles} = await admin
    .from("tech_desk_knowledge_articles")
    .select("id,code,title,summary,public_steps,escalation_rule")
    .eq("active", true)
    .order("title");
  return (
    <main className="section">
      <div className="shell" style={{maxWidth: 980}}>
        <div className="section-head">
          <div>
            <div className="eyebrow">Safe self-service guidance</div>
            <h1>EFF Tech Help Library</h1>
            <p className="lead">
              Try the approved steps once, then open one ticket if the problem
              continues.
            </p>
          </div>
          <BookOpenCheck/>
        </div>
        <div className="notice">
          <ShieldCheck/>
          <span>
            EFF will never ask for your password, verification code, private API
            key, Social Security number, or full bank details.
          </span>
        </div>
        <section className="tech-desk-knowledge">
          {(articles ?? []).map((article) => {
            const steps = Array.isArray(article.public_steps)
              ? article.public_steps.filter(
                  (step: unknown): step is string => typeof step === "string",
                )
              : [];
            return (
              <details key={article.id}>
                <summary>{article.title}</summary>
                <p>{article.summary}</p>
                <ol>
                  {steps.map((step) => <li key={step}>{step}</li>)}
                </ol>
                <p className="muted">
                  <strong>When EFF reviews it:</strong> {article.escalation_rule}
                </p>
              </details>
            );
          })}
        </section>
        <div className="hero-actions">
          <Link className="button" href="/tech-desk/open-ticket">
            Open One Secure Ticket
          </Link>
          <Link className="button outline" href="/tech-desk/status">
            Check Platform Status
          </Link>
        </div>
      </div>
    </main>
  );
}
