import {describe, expect, it} from "vitest";
import {
  buildVolunteerApplicationRecord,
  helpDeskVolunteerModuleKeys,
  isHelpDeskVolunteerModuleKey,
} from "./help-desk-volunteer";

describe("Help Desk volunteer onboarding compatibility", () => {
  it("keeps all six Academy modules available", () => {
    expect(helpDeskVolunteerModuleKeys).toEqual([
      "listen",
      "privacy",
      "boundaries",
      "routing",
      "safety",
      "quality",
    ]);
    expect(isHelpDeskVolunteerModuleKey("privacy")).toBe(true);
    expect(isHelpDeskVolunteerModuleKey("scholarship-records")).toBe(false);
  });

  it("populates legacy and 2.0 profile fields before showing modules", () => {
    const acceptedAt = "2026-07-30T12:00:00.000Z";
    const record = buildVolunteerApplicationRecord({
      userId: "63a0bc10-98de-4e06-95fb-8d8513123f5f",
      email: "volunteer@example.org",
      legalName: "Esther Volunteer",
      preferredName: "Esther",
      timeZone: "America/New_York",
      motivation: "I want to help students find a dignified next step.",
      experience: "",
      availability: "Tuesday and Thursday evenings",
      acceptedAt,
    });

    expect(record.display_name).toBe("Esther");
    expect(record.notification_email).toBe("volunteer@example.org");
    expect(record.legal_name).toBe("Esther Volunteer");
    expect(record.email).toBe("volunteer@example.org");
    expect(record.status).toBe("training");
    expect(record.onboarding_step).toBe("training");
    expect(record.agreement_at).toBe(acceptedAt);
  });
});
