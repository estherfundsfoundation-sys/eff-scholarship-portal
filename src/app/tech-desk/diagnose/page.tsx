import type {Metadata} from "next";
import Link from "next/link";
import {AlertTriangle, Bot, CheckCircle2, ShieldCheck} from "lucide-react";
import {
  classifyTechIssue,
  techDeskIssueCategories,
  techDeskProducts,
  type TechDeskUrgency,
} from "@/lib/tech-desk";

export const metadata: Metadata = {title: "Instant Tech Check"};

type Query = {
  product?: string;
  category?: string;
  urgency?: TechDeskUrgency;
  description?: string;
  error?: string;
};

const urgencyOptions: Array<[TechDeskUrgency, string]> = [
  ["question", "I have a question"],
  ["partially_blocked", "I can continue some work"],
  ["fully_blocked", "I cannot continue"],
  ["deadline_within_72_hours", "A verified deadline is within 72 hours"],
];

export default async function TechDeskDiagnose({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const query = await searchParams;
  const category = techDeskIssueCategories.some(([value]) => value === query.category)
    ? query.category!
    : "";
  const urgency = urgencyOptions.some(([value]) => value === query.urgency)
    ? query.urgency!
    : "question";
  const product = techDeskProducts.some((item) => item.slug === query.product)
    ? query.product!
    : "";
  const description = (query.description ?? "").trim().slice(0, 1000);
  const errorMessage = (query.error ?? "").trim().slice(0, 500);
  const diagnosis =
    category && description.length >= 8
      ? classifyTechIssue({
          category,
          description: `${product} ${description}`,
          errorMessage,
          urgency,
        })
      : null;

  return (
    <main className="section white">
      <div className="shell tech-desk-form-grid">
        <section>
          <div className="eyebrow">No AI credits required</div>
          <h1>Instant EFF Tech Check</h1>
          <p className="lead">
            Get safe first steps from EFF’s rule-based support engine. It works
            without ChatGPT and does not need your password, code, or private data.
          </p>
          <form method="get" className="card tech-desk-form">
            <label>
              EFF platform
              <select name="product" required defaultValue={product}>
                <option value="" disabled>Select a platform</option>
                {techDeskProducts.map((item) => (
                  <option key={item.slug} value={item.slug}>{item.name}</option>
                ))}
              </select>
            </label>
            <label>
              What kind of problem is this?
              <select name="category" required defaultValue={category}>
                <option value="" disabled>Select the closest issue</option>
                {techDeskIssueCategories.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              How much is it blocking you?
              <select name="urgency" defaultValue={urgency}>
                {urgencyOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              What happened?
              <textarea
                name="description"
                required
                minLength={8}
                maxLength={1000}
                defaultValue={description}
                placeholder="Example: I signed in, but Name Your Need is missing from my dashboard."
              />
            </label>
            <label>
              Exact error message <span className="muted">(optional)</span>
              <textarea
                name="error"
                maxLength={500}
                defaultValue={errorMessage}
                placeholder="Copy the error after removing passwords, codes, keys, and private information."
              />
            </label>
            <button className="button"><Bot/> Check This Problem</button>
          </form>
        </section>

        <aside className="stack">
          <div className="notice">
            <ShieldCheck/>
            <span>
              This checker runs approved EFF rules. It never changes an account,
              application, production site, database, or permission.
            </span>
          </div>
          {diagnosis ? (
            <article className="card">
              <div className="section-head">
                <div>
                  <div className="eyebrow">{diagnosis.code.replaceAll("_", " ")}</div>
                  <h2>{diagnosis.title}</h2>
                </div>
                {diagnosis.requiresStaffReview ? <AlertTriangle/> : <CheckCircle2/>}
              </div>
              <p>{diagnosis.summary}</p>
              <ol className="tech-desk-diagnosis-steps">
                {diagnosis.steps.map((step) => <li key={step}>{step}</li>)}
              </ol>
              <p className="muted">
                <strong>{diagnosis.priority} priority.</strong>{" "}
                {diagnosis.requiresStaffReview
                  ? "A verified ticket is required before staff reviews the account or system."
                  : "Try these steps once. Open one ticket if the problem continues."}
              </p>
              <div className="hero-actions">
                <Link className="button" href="/tech-desk/open-ticket">
                  Open One Secure Ticket
                </Link>
                <Link className="button outline" href="/tech-desk/common-questions">
                  Read Common Answers
                </Link>
              </div>
            </article>
          ) : (
            <article className="card">
              <Bot/>
              <h2>Tell the checker what happened.</h2>
              <p>
                You will receive a diagnosis category, safe steps, priority, and a
                clear answer about whether staff review is needed.
              </p>
            </article>
          )}
        </aside>
      </div>
    </main>
  );
}
