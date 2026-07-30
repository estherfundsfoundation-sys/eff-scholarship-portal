import type {Metadata} from "next";
import Link from "next/link";
import {BookOpenCheck, Search, ShieldCheck} from "lucide-react";
import {techDeskCommonQuestions} from "@/lib/tech-desk-guides";

export const metadata: Metadata = {title: "Common Tech Questions"};

export default async function TechDeskCommonQuestions({
  searchParams,
}: {
  searchParams: Promise<{q?: string}>;
}) {
  const query = ((await searchParams).q ?? "").trim().toLowerCase().slice(0, 100);
  const visible = query
    ? techDeskCommonQuestions.filter((guide) =>
        `${guide.category} ${guide.question} ${guide.answer} ${guide.steps.join(" ")}`
          .toLowerCase()
          .includes(query),
      )
    : techDeskCommonQuestions;
  const categories = new Map<string, typeof visible>();
  for (const guide of visible) {
    categories.set(guide.category, [...(categories.get(guide.category) ?? []), guide]);
  }

  return (
    <main className="section white">
      <div className="shell" style={{maxWidth: 1080}}>
        <div className="section-head">
          <div>
            <div className="eyebrow">Answers without waiting or AI credits</div>
            <h1>Common EFF Tech Questions</h1>
            <p className="lead">
              Search practical answers for EFF accounts, email, applications,
              MyEFF, REACH, uploads, websites, privacy, and tickets.
            </p>
          </div>
          <BookOpenCheck/>
        </div>
        <form method="get" className="card" style={{marginBottom: 26}}>
          <label>
            Search common questions
            <span className="two">
              <input name="q" defaultValue={query} placeholder="Try: password, Name Your Need, REACH, photo, or 404"/>
              <button className="button"><Search/> Search</button>
            </span>
          </label>
        </form>
        <div className="notice">
          <ShieldCheck/>
          <span>
            Never enter a password, verification code, API key, Social Security
            number, bank detail, or private document in this search.
          </span>
        </div>
        {[...categories].map(([category, guides]) => (
          <section key={category} style={{marginTop: 34}}>
            <div className="eyebrow">{category}</div>
            <div className="tech-desk-knowledge">
              {guides.map((guide) => (
                <details key={guide.question}>
                  <summary>{guide.question}</summary>
                  <p>{guide.answer}</p>
                  <ol>{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol>
                  {guide.link && (
                    <p><Link className="card-link" href={guide.link.href}>{guide.link.label} →</Link></p>
                  )}
                </details>
              ))}
            </div>
          </section>
        ))}
        {!visible.length && (
          <article className="card" style={{marginTop: 28}}>
            <h2>No exact answer found.</h2>
            <p>Use the instant checker or open one secure ticket with the exact page and message.</p>
          </article>
        )}
        <div className="hero-actions" style={{marginTop: 34}}>
          <Link className="button" href="/tech-desk/diagnose">Run an Instant Tech Check</Link>
          <Link className="button outline" href="/tech-desk/open-ticket">Open One Secure Ticket</Link>
        </div>
      </div>
    </main>
  );
}
