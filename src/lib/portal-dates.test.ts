import {describe, expect, it} from "vitest";
import {formatEasternDateTime} from "./portal-dates";

describe("formatEasternDateTime", () => {
  it("shows a stored UTC timestamp in the program deadline time zone", () => {
    expect(formatEasternDateTime("2026-08-01T03:36:27.000Z")).toContain(
      "Jul 31, 2026, 11:36:27 PM EDT",
    );
  });
});
