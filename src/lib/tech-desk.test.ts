import {describe, expect, it} from "vitest";
import {
  classifyTechIssue,
  normalizeOfficialEffUrl,
  normalizeTechTicketNumber,
  redactSensitiveText,
  safeTechDeskDestination,
} from "./tech-desk";

describe("EFF Tech Desk safety and routing", () => {
  it("normalizes public ticket numbers without accepting database ids", () => {
    expect(normalizeTechTicketNumber(" eff-tech-2026-a1b2c3d4 ")).toBe(
      "EFF-TECH-2026-A1B2C3D4",
    );
    expect(normalizeTechTicketNumber("479c565b-e7a9-4f60-9de6-d0c33b59f566")).toBe("");
  });

  it("only accepts official EFF HTTPS page URLs", () => {
    expect(normalizeOfficialEffUrl("https://my.estherfundsfoundation.org/login")).toBe(
      "https://my.estherfundsfoundation.org/login",
    );
    expect(normalizeOfficialEffUrl("https://evil.example/portal")).toBeNull();
    expect(normalizeOfficialEffUrl("http://portal.estherfundsfoundation.org")).toBeNull();
  });

  it("redacts secrets and highly sensitive identifiers", () => {
    const result = redactSensitiveText(
      "password: Hunter2 api key=re_12345678901234567890 SSN 123-45-6789",
    );
    expect(result).not.toContain("Hunter2");
    expect(result).not.toContain("re_12345678901234567890");
    expect(result).not.toContain("123-45-6789");
  });

  it("prevents external or near-match staff redirects", () => {
    expect(safeTechDeskDestination("//evil.example")).toBe("/tech-desk/admin");
    expect(safeTechDeskDestination("/tech-desk/admin-evil")).toBe("/tech-desk/admin");
    expect(safeTechDeskDestination("/tech-desk/admin/tickets")).toBe(
      "/tech-desk/admin/tickets",
    );
  });

  it("recognizes configuration failures as approval-controlled staff work", () => {
    const diagnosis = classifyTechIssue({
      category: "website_error",
      description: "Registration could not be completed",
      errorMessage: "Invalid API key",
      urgency: "fully_blocked",
    });
    expect(diagnosis.code).toBe("INVALID_CONFIGURATION");
    expect(diagnosis.requiresStaffReview).toBe(true);
    expect(diagnosis.priority).toBe("P1");
  });

  it("provides safe self-service steps for password trouble", () => {
    const diagnosis = classifyTechIssue({
      category: "password_sign_in",
      description: "My password is not working on MyEFF",
      urgency: "fully_blocked",
    });
    expect(diagnosis.code).toBe("PASSWORD_SIGN_IN");
    expect(diagnosis.steps.join(" ")).toMatch(/newest/i);
    expect(diagnosis.steps.join(" ")).toMatch(/Do not create a second account/i);
  });

  it("recognizes the missing REACH claim route as a system issue", () => {
    const diagnosis = classifyTechIssue({
      category: "broken_link",
      description: "My REACH ambassador claim link gives a 404",
      urgency: "fully_blocked",
    });
    expect(diagnosis.code).toBe("REACH_CLAIM_404");
    expect(diagnosis.priority).toBe("P1");
    expect(diagnosis.steps.join(" ")).toMatch(/\/reach\/claim/);
  });

  it("recognizes missing MyEFF membership permissions", () => {
    const diagnosis = classifyTechIssue({
      category: "session_access",
      description: "MyEFF says permission denied and the membership record could not load",
      urgency: "fully_blocked",
    });
    expect(diagnosis.code).toBe("MYEFF_PROFILE_PERMISSION");
    expect(diagnosis.requiresStaffReview).toBe(true);
  });

  it("preserves an application when the portal says it already exists", () => {
    const diagnosis = classifyTechIssue({
      category: "scholarship_application",
      description: "Name Your Need says an application already exists but it is missing",
      urgency: "fully_blocked",
    });
    expect(diagnosis.code).toBe("APPLICATION_ALREADY_EXISTS");
    expect(diagnosis.steps.join(" ")).toMatch(/Do not create a second/i);
  });

  it("recognizes protected Vercel links", () => {
    const diagnosis = classifyTechIssue({
      category: "broken_link",
      description: "The EFF button opened a protected Vercel login screen",
      urgency: "fully_blocked",
    });
    expect(diagnosis.code).toBe("PROTECTED_VERCEL_PAGE");
    expect(diagnosis.requiresStaffReview).toBe(true);
  });

  it("routes application reconsideration requests without calling them technical blocks", () => {
    const diagnosis = classifyTechIssue({
      category: "scholarship_application",
      description: "I am requesting reconsideration with a corrected requested amount.",
      urgency: "question",
    });
    expect(diagnosis.code).toBe("APPLICATION_POLICY_REQUEST");
    expect(diagnosis.summary).toMatch(/rather than a reproducible technical failure/i);
  });
});
