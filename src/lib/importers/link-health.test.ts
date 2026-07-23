import { describe, expect, it } from "vitest";
import { shouldArchiveScholarshipLink } from "./link-health-rules";

describe("scholarship link health", () => {
  it("archives only definitive not-found responses", () => {
    expect(shouldArchiveScholarshipLink(404)).toBe(true);
    expect(shouldArchiveScholarshipLink(410)).toBe(true);
    expect(shouldArchiveScholarshipLink(200)).toBe(false);
    expect(shouldArchiveScholarshipLink(403)).toBe(false);
    expect(shouldArchiveScholarshipLink(429)).toBe(false);
    expect(shouldArchiveScholarshipLink(500)).toBe(false);
    expect(shouldArchiveScholarshipLink(null)).toBe(false);
  });
});
