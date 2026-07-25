import {describe, expect, it} from "vitest";
import {
  FIRST_GEN_FAMILY_NAVIGATOR_PASSING_SCORE,
  firstGenFamilyNavigatorFinalQuestions,
  firstGenFamilyNavigatorModules,
} from "./first-gen-family-navigator";

describe("first-generation family navigator course", () => {
  it("has eight complete modules with unique checks and official sources", () => {
    expect(firstGenFamilyNavigatorModules).toHaveLength(8);
    const checkIds = firstGenFamilyNavigatorModules.flatMap(module => module.checks.map(check => check.id));
    expect(new Set(checkIds).size).toBe(checkIds.length);
    for (const courseModule of firstGenFamilyNavigatorModules) {
      expect(courseModule.sections.length).toBeGreaterThanOrEqual(3);
      expect(courseModule.checks).toHaveLength(2);
      expect(courseModule.sources.length).toBeGreaterThan(0);
      expect(courseModule.sources.every(source => source.href.startsWith("https://"))).toBe(true);
    }
  });

  it("uses a ten-question assessment and an 80 percent passing score", () => {
    expect(firstGenFamilyNavigatorFinalQuestions).toHaveLength(10);
    expect(FIRST_GEN_FAMILY_NAVIGATOR_PASSING_SCORE).toBe(80);
    expect(new Set(firstGenFamilyNavigatorFinalQuestions.map(question => question.id)).size).toBe(10);
  });
});
