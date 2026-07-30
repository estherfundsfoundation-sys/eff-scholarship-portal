import {describe, expect, it} from "vitest";
import {
  helpDeskSignInForDestination,
  normalizeHelpDeskCaseNumber,
  safeHelpDeskDestination,
  volunteerDestination,
} from "./help-desk-context";

describe("Help Desk product context", () => {
  it("normalizes public case numbers without accepting database IDs", () => {
    expect(normalizeHelpDeskCaseNumber(" eff-2026-a1b2c3d4 ")).toBe("EFF-2026-A1B2C3D4");
    expect(normalizeHelpDeskCaseNumber("479c565b-e7a9-4f60-9de6-d0c33b59f566")).toBe("");
  });

  it("prevents cross-product and cross-role redirects", () => {
    expect(safeHelpDeskDestination("/dashboard", "volunteer")).toBe(
      "/help-desk/volunteer/onboarding",
    );
    expect(safeHelpDeskDestination("//evil.example", "staff")).toBe("/help-desk/admin");
    expect(safeHelpDeskDestination("/help-desk/admin", "volunteer")).toBe(
      "/help-desk/volunteer/onboarding",
    );
    expect(safeHelpDeskDestination("/help-desk/volunteer/console", "volunteer")).toBe(
      "/help-desk/volunteer/console",
    );
    expect(safeHelpDeskDestination("/help-desk/volunteer-evil", "volunteer")).toBe(
      "/help-desk/volunteer/onboarding",
    );
    expect(safeHelpDeskDestination("/help-desk/admin-evil", "staff")).toBe(
      "/help-desk/admin",
    );
  });

  it("corrects old generic sign-in links before scholarship copy is shown", () => {
    expect(helpDeskSignInForDestination("/help-desk/volunteer/console")).toContain(
      "/help-desk/volunteer/sign-in",
    );
    expect(helpDeskSignInForDestination("/help-desk/admin")).toContain(
      "/help-desk/staff/sign-in",
    );
  });

  it("routes volunteers by their Help Desk status", () => {
    expect(volunteerDestination("active")).toBe("/help-desk/volunteer/console");
    expect(volunteerDestination("awaiting_approval")).toContain("approval");
    expect(volunteerDestination("suspended")).toContain("restricted");
  });
});
