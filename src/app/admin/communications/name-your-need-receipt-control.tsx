import {
  queueNameYourNeedReceipts,
  retryNameYourNeedReceiptFailures,
} from "./actions";

export type NameYourNeedReceiptMetrics = {
  recipient_count: number;
  eligible_count: number;
  queued_count: number;
  processing_count: number;
  failed_count: number;
  sent_count: number;
  suppressed_count: number;
  invalid_count: number;
  duplicate_count: number;
};

export function NameYourNeedReceiptControl({
  metrics,
  queuedNow,
  retriedNow,
  canManage,
}: {
  metrics: NameYourNeedReceiptMetrics;
  queuedNow?: string;
  retriedNow?: string;
  canManage: boolean;
}) {
  return (
    <section className="card" style={{marginTop: 24}}>
      <div className="eyebrow">Name Your Need 2026 receipt control</div>
      <h3>Submitted-applicant receipt</h3>
      <p>
        This transactional receipt confirms submission and explains the
        6–8-week review window. It does not promise funding, approval,
        eligibility, payment, or a decision date.
      </p>
      {queuedNow !== undefined && (
        <div className="notice success-text">
          {queuedNow} new receipt{queuedNow === "1" ? "" : "s"} added to the
          delivery queue.
        </div>
      )}
      {retriedNow !== undefined && (
        <div className="notice success-text">
          {retriedNow} failed receipt{retriedNow === "1" ? "" : "s"} returned
          to the safe queue.
        </div>
      )}
      <div className="stats email-health-stats">
        <div className="stat">
          <strong>{metrics.recipient_count}</strong>
          <span>Valid unique recipients</span>
        </div>
        <div className="stat">
          <strong>{metrics.eligible_count}</strong>
          <span>Eligible, not queued</span>
        </div>
        <div className="stat">
          <strong>{metrics.queued_count}</strong>
          <span>Queued</span>
        </div>
        <div className="stat">
          <strong>{metrics.processing_count}</strong>
          <span>Processing</span>
        </div>
        <div className="stat">
          <strong>{metrics.failed_count}</strong>
          <span>Failed</span>
        </div>
        <div className="stat">
          <strong>{metrics.sent_count}</strong>
          <span>Accepted by provider</span>
        </div>
      </div>
      <p className="muted">
        Excluded automatically: {metrics.suppressed_count} suppressed or
        bounced, {metrics.invalid_count} invalid/test/no-reply, and{" "}
        {metrics.duplicate_count} duplicate application record
        {metrics.duplicate_count === 1 ? "" : "s"}. The idempotency key is
        based on the normalized recipient, so the same student cannot receive
        this exact receipt twice.
      </p>
      {canManage ? (
      <div className="admin-columns" style={{marginTop: 20}}>
        <form action={queueNameYourNeedReceipts} className="stack">
          <h4>Queue the approved batch</h4>
          <p className="muted">
            This adds only the currently eligible recipients to the existing
            messages queue. The email worker sends queued messages separately.
          </p>
          <label>
            Type QUEUE NAME YOUR NEED RECEIPTS
            <input
              name="confirmation"
              required
              autoComplete="off"
              pattern="QUEUE NAME YOUR NEED RECEIPTS"
            />
          </label>
          <button className="button">Queue approved receipt batch</button>
        </form>
        <form action={retryNameYourNeedReceiptFailures} className="stack">
          <h4>Retry failed receipts</h4>
          <p className="muted">
            Only failed messages that still have a safe payload and are not
            suppressed can return to the queue.
          </p>
          <label>
            Type RETRY FAILED RECEIPTS
            <input
              name="confirmation"
              required
              autoComplete="off"
              pattern="RETRY FAILED RECEIPTS"
            />
          </label>
          <button className="button outline">Retry safe failures</button>
        </form>
      </div>
      ) : (
        <p className="muted">
          Only a super administrator can queue or retry this campaign after
          the recipient count is approved.
        </p>
      )}
    </section>
  );
}
