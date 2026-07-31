import {describe, expect, it} from "vitest";
import {
  isActiveStaffRole,
  normalizeStaffEmail,
  safeStaffDestination,
  staffAccessHash,
} from "./staff-access";

describe("staff access helpers", () => {
  it("normalizes email without exposing any credential", () => {
    expect(normalizeStaffEmail("  Nationals@EstherFundsInc.org ")).toBe(
      "nationals@estherfundsinc.org",
    );
  });

  it("accepts only active scholarship staff roles", () => {
    expect(isActiveStaffRole("reviewer", true)).toBe(true);
    expect(isActiveStaffRole("finance", true)).toBe(true);
    expect(isActiveStaffRole("program_admin", true)).toBe(true);
    expect(isActiveStaffRole("super_admin", true)).toBe(true);
    expect(isActiveStaffRole("super_admin", false)).toBe(false);
    expect(isActiveStaffRole("applicant", true)).toBe(false);
  });

  it("keeps post-verification redirects inside scholarship administration", () => {
    expect(safeStaffDestination("/admin/applications")).toBe(
      "/admin/applications",
    );
    expect(safeStaffDestination("/dashboard")).toBe("/admin");
    expect(safeStaffDestination("https://example.com")).toBe("/admin");
  });

  it("creates stable non-reversible audit identifiers", () => {
    const secret = "a-secure-test-secret-that-is-more-than-32-characters";
    const first = staffAccessHash("nationals@estherfundsinc.org", secret);
    expect(first).toBe(staffAccessHash("nationals@estherfundsinc.org", secret));
    expect(first).not.toContain("nationals");
    expect(first).toHaveLength(64);
  });
});
