import Link from "next/link";
import {notFound, redirect} from "next/navigation";
import {ApplicationFields} from "@/components/application-fields";
import {serviceApplicationConfigs} from "@/lib/application-form-config";
import {createClient} from "@/lib/supabase/server";
import {ApplicationForm} from "./application-form";

type ApplicationAnswer = {question_key: string; value: unknown};
type ApplicationDocument = {kind: string; filename: string};
type ProgramCycle = {
  closes_at: string | null;
  programs: {name: string; slug: string};
  policy_versions: Array<{
    id: string;
    version: number;
    body: string;
    published_at: string | null;
  }>;
};

function deadlineText(value: string | null) {
  if (!value) return "See the official program page";
  return `${new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(new Date(value))} Eastern`;
}

export default async function EditApplication({
  params,
  searchParams,
}: {
  params: Promise<{id: string}>;
  searchParams: Promise<{saved?: string; error?: string}>;
}) {
  const {id} = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const {data: application} = await supabase
    .from("applications")
    .select(
      "id,status,application_answers(question_key,value),documents(kind,filename),program_cycles(name,closes_at,programs(name,slug),policy_versions(id,version,body,published_at))",
    )
    .eq("id", id)
    .single();

  if (!application) notFound();
  if (!["draft", "additional_information_needed"].includes(application.status)) {
    redirect(`/applications/${id}`);
  }

  const answers = Object.fromEntries(
    ((application.application_answers as unknown as ApplicationAnswer[]) ?? []).map((item) => [
      item.question_key,
      typeof item.value === "string" ? item.value : JSON.stringify(item.value),
    ]),
  );
  const cycle = application.program_cycles as unknown as ProgramCycle;
  const policy = cycle.policy_versions.find((item) => item.published_at);
  if (!policy) throw new Error("The application agreement is unavailable.");

  const documents =
    (application.documents as unknown as ApplicationDocument[]) ?? [];
  const programSlug = cycle.programs.slug;
  const isServiceApplication = Boolean(serviceApplicationConfigs[programSlug]);

  return (
    <main className="section">
      <div className="shell form-shell">
        <Link className="card-link" href="/dashboard">
          ← Save and return to dashboard
        </Link>
        <div className="form-heading">
          <div>
            <div className="eyebrow">Official application</div>
            <h2>{cycle.programs.name}</h2>
            <p className="muted">
              Deadline: {deadlineText(cycle.closes_at)} · Your draft saves when you choose
              Save draft.
            </p>
          </div>
          <div className="progress-ring" aria-label="Application in progress">
            {isServiceApplication ? "5 sections" : "7 sections"}
          </div>
        </div>
        {query.saved && (
          <div className="notice" role="status">
            <strong>Draft saved.</strong> You can safely leave and return later.
          </div>
        )}
        {query.error && (
          <div className="notice" role="alert">
            <strong>We could not complete that step.</strong>
            <br />
            {query.error}
          </div>
        )}
        <ApplicationForm applicationId={id}>
          <input type="hidden" name="policy_version_id" value={policy.id} />
          <ApplicationFields
            programSlug={programSlug}
            answers={answers}
            documents={documents}
            policyBody={policy.body}
          />
          <div className="form-actions">
            <button className="button outline" name="intent" value="save" formNoValidate>
              Save draft
            </button>
            <button className="button" name="intent" value="submit">
              Review and submit application
            </button>
          </div>
        </ApplicationForm>
      </div>
    </main>
  );
}