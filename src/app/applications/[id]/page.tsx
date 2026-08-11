import Link from "next/link";
import {notFound} from "next/navigation";
import {acceptAward, respondToRequest, withdrawApplication} from "./actions";
import {applicantLabels, type ApplicationStatus} from "@/lib/domain";
import {formatEasternDateTime} from "@/lib/portal-dates";
import {createClient} from "@/lib/supabase/server";

type Request = {
  id: string;
  item: string;
  due_at: string | null;
  response: string | null;
  resolved_at: string | null;
};

export default async function ApplicationDetail({
  params,
  searchParams,
}: {
  params: Promise<{id: string}>;
  searchParams: Promise<{submitted?: string}>;
}) {
  const {id} = await params;
  const submitted = (await searchParams).submitted === "1";
  const supabase = await createClient();
  const {data: application} = await supabase
    .from("applications")
    .select(
      "id,status,submitted_at,created_at,updated_at,program_cycles(name,programs(name)),status_history(previous_status,new_status,applicant_note,created_at),information_requests(id,item,due_at,response,resolved_at,created_at),decisions(decision,applicant_explanation,confirmed_at),awards(id,amount,conditions,acceptance_deadline,accepted_at,disbursement_status,scheduled_date)",
    )
    .eq("id", id)
    .single();
  if (!application) notFound();

  const history =
    (application.status_history as unknown as Array<{
      new_status: ApplicationStatus;
      applicant_note: string | null;
      created_at: string;
    }>) ?? [];
  const requests =
    (application.information_requests as unknown as Request[]) ?? [];
  const decision = (
    application.decisions as unknown as Array<{
      decision: string;
      applicant_explanation: string | null;
      confirmed_at: string;
    }>
  )?.[0];
  const award = (
    application.awards as unknown as Array<{
      amount: number;
      conditions: string | null;
      acceptance_deadline: string | null;
      accepted_at: string | null;
      scheduled_date: string | null;
    }>
  )?.[0];
  const editable = ["draft", "additional_information_needed"].includes(
    application.status,
  );
  const mayWithdraw = [
    "draft",
    "applied",
    "review_by_admin",
    "additional_information_needed",
  ].includes(application.status);
  const program = application.program_cycles as unknown as {
    programs: {name: string};
  };

  return (
    <main className="section">
      <div className="shell" style={{maxWidth: 800}}>
        <Link className="card-link" href="/dashboard">
          ← Dashboard
        </Link>
        {submitted && (
          <div className="notice">
            <strong>Application submitted successfully.</strong>
            <br />A confirmation is being sent to your email. You can follow
            every update here.
          </div>
        )}
        <div className="card" style={{marginTop: 18}}>
          <div className="eyebrow">
            {applicantLabels[application.status as ApplicationStatus]}
          </div>
          <h2>{program?.programs?.name ?? "EFF application"}</h2>
          <p className="muted">Application ID: {application.id}</p>
          {editable && (
            <a className="button" href={`/applications/${id}/edit`}>
              Continue application
            </a>
          )}

          {requests.map((request) => (
            <section
              className="notice"
              key={request.id}
              style={{marginBottom: 16}}
            >
              <strong>
                {request.resolved_at
                  ? "Information received"
                  : "Information needed"}
              </strong>
              <p>{request.item}</p>
              {request.due_at && (
                <p>
                  Requested by <strong>{formatEasternDateTime(request.due_at)}</strong>
                </p>
              )}
              {request.resolved_at ? (
                <p>Your response: {request.response}</p>
              ) : (
                <form action={respondToRequest} className="stack">
                  <input type="hidden" name="application_id" value={id} />
                  <input
                    type="hidden"
                    name="request_id"
                    value={request.id}
                  />
                  <label>
                    Your response
                    <textarea name="response" required rows={5} />
                  </label>
                  <button className="button">Send response securely</button>
                </form>
              )}
            </section>
          ))}

          {decision && (
            <div className="notice">
              <strong>Decision: {decision.decision}</strong>
              <br />
              {decision.applicant_explanation ||
                "Please contact EFF if you have questions about this decision."}
            </div>
          )}

          {award && (
            <section className="award-card">
              <div className="eyebrow">Your award</div>
              <h3>
                $
                {Number(award.amount).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </h3>
              {award.conditions && <p>{award.conditions}</p>}
              <p>
                Accept by:{" "}
                <strong>
                  {award.acceptance_deadline
                    ? new Date(
                        `${award.acceptance_deadline}T12:00:00`,
                      ).toLocaleDateString()
                    : "Contact EFF"}
                </strong>
              </p>
              {award.accepted_at ? (
                <p className="notice">
                  <strong>Accepted</strong> on{" "}
                  {formatEasternDateTime(award.accepted_at)}
                </p>
              ) : (
                <form action={acceptAward}>
                  <input type="hidden" name="application_id" value={id} />
                  <button className="button">Accept award</button>
                </form>
              )}
            </section>
          )}

          <h3>Status timeline</h3>
          <p className="muted">
            Official program timestamps are shown in Eastern Time.
          </p>
          {history.length ? (
            <ol>
              {history
                .sort((first, second) =>
                  first.created_at.localeCompare(second.created_at),
                )
                .map((item, index) => (
                  <li key={`${item.created_at}-${index}`}>
                    <strong>
                      {applicantLabels[item.new_status] ?? item.new_status}
                    </strong>{" "}
                    — {formatEasternDateTime(item.created_at)}
                    {item.applicant_note && <p>{item.applicant_note}</p>}
                  </li>
                ))}
            </ol>
          ) : (
            <p className="muted">
              Your draft has been created. Status updates will appear here.
            </p>
          )}

          {mayWithdraw && (
            <details style={{marginTop: 24}}>
              <summary>Withdraw this application</summary>
              <form action={withdrawApplication} className="stack">
                <input type="hidden" name="application_id" value={id} />
                <label>
                  Reason (optional)
                  <textarea name="reason" rows={3} />
                </label>
                <button className="button outline">Confirm withdrawal</button>
              </form>
            </details>
          )}
        </div>
      </div>
    </main>
  );
}
