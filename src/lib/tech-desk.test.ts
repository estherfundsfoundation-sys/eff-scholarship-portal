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
});
