import {describe, expect, it} from "vitest";
import {
  nameYourNeedReceiptBody,
  nameYourNeedReceiptTemplateKey,
  renderNameYourNeedReceiptFallback,
} from "./name-your-need-receipt";

describe("Name Your Need application receipt", () => {
  it("uses a version-specific message type for idempotent delivery", () => {
    expect(nameYourNeedReceiptTemplateKey).toBe(
      "name_your_need_application_receipt_2026",
    );
  });

  it("contains the approved timing and non-guarantee language", () => {
    expect(nameYourNeedReceiptBody).toContain("We received");
    expect(nameYourNeedReceiptBody).toContain("now under review");
    expect(nameYourNeedReceiptBody).toContain("6–8 weeks");
    expect(nameYourNeedReceiptBody).toContain("July 31, 2026");
    expect(nameYourNeedReceiptBody).toContain(
      "does not guarantee funding or an award",
    );
    expect(nameYourNeedReceiptBody).not.toMatch(
      /approved|eligible|payment date|decision date/i,
    );
  });

  it("renders the same copy safely when no configured template is available", () => {
    const rendered = renderNameYourNeedReceiptFallback(
      '<Applicant & "Family">',
      "https://portal.estherfundsfoundation.org/applications/example",
    );
    expect(rendered.html).toContain("&lt;Applicant &amp; &quot;Family&quot;&gt;");
    expect(rendered.html).toContain("6–8 weeks");
    expect(rendered.html).toContain("Submission does not guarantee");
  });
});
