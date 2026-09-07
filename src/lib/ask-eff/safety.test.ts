import {describe, expect, it} from "vitest";
import {containsSensitiveData, disclosesUnderage, extractInstitutionMention, isEducationRelated, isSafeActionUrl, isUrgentSafetyMessage, needsCurrentResearch, redactForPublicSearch} from "./safety";
import {removeUnknownCitationIds, validateEvidenceSources} from "./citations";
import {ownerApprovedPrograms, relevantPrograms} from "./program-registry";
import {askEffEvaluations} from "./evaluations";

describe("Ask EFF deterministic boundaries", () => {
  it("contains at least 40 representative evaluation cases", () => expect(askEffEvaluations.length).toBeGreaterThanOrEqual(40));
  it.each("ABCDEFGHIJKLMNOPQR".split(""))("contains required case %s", (id) => expect(askEffEvaluations.some((item) => item.id === id)).toBe(true));
  it("uses the one approved EFF chapter form", () => expect(ownerApprovedPrograms.find((item) => item.programId === "start-eff-chapter")?.canonicalUrl).toBe("https://form.jotform.com/261806820999067"));
  it("keeps financial assistance paused", () => expect(ownerApprovedPrograms.find((item) => item.programId === "financial-assistance")?.status).toBe("paused"));
  it("keeps K-12 coming soon", () => expect(ownerApprovedPrograms.find((item) => item.programId === "k12")?.status).toBe("coming_soon"));
  it("keeps PGWS chapter rules separate", () => expect(ownerApprovedPrograms.find((item) => item.programId === "pgws")?.canonicalUrl).toBe("https://prettygirlswhoserve.org"));
  it("routes recommendation letters without signing", () => expect(ownerApprovedPrograms.find((item) => item.programId === "recommendation-letters")?.canonicalUrl).toContain("nationals@estherfundsinc.org"));
  it("detects sensitive identifiers", () => expect(containsSensitiveData("student ID: A1234567")).toBe(true));
  it("detects email addresses", () => expect(containsSensitiveData("me@example.com")).toBe(true));
  it("redacts private data from search queries", () => expect(redactForPublicSearch("Search my student ID 123456789 and me@example.com")).not.toContain("me@example.com"));
  it("recognizes urgent safety language", () => expect(isUrgentSafetyMessage("I want to kill myself")).toBe(true));
  it("recognizes underage disclosure", () => expect(disclosesUnderage("I'm 16 and in college")).toBe(true));
  it("recognizes education scope", () => expect(isEducationRelated("I cannot register for classes")).toBe(true));
  it("recognizes plural scholarship and class prompts", () => {
    expect(isEducationRelated("Help me find scholarships")).toBe(true);
    expect(isEducationRelated("I am struggling in my classes")).toBe(true);
  });
  it("recognizes broad graduation and career-transition questions", () => {
    expect(isEducationRelated("What do I need to do before graduation?")).toBe(true);
    expect(isEducationRelated("Can you help me plan my remaining credits?")).toBe(true);
    expect(isEducationRelated("How should I prepare for graduate school?")).toBe(true);
    expect(isEducationRelated("Help me improve my resume for internships")).toBe(true);
  });
  it("recognizes EFF program names as in scope", () => {
    expect(isEducationRelated("What is REACH?")).toBe(true);
    expect(isEducationRelated("How do I use MyEFF?")).toBe(true);
    expect(isEducationRelated("Tell me about FutureLink")).toBe(true);
    expect(isEducationRelated("What is Pretty Girls Who Serve?")).toBe(true);
  });
  it("does not force unrelated entertainment into scope", () => expect(isEducationRelated("Tell me celebrity gossip")).toBe(false));
  it("routes time-sensitive questions to research", () => expect(needsCurrentResearch("What is the deadline this year?")).toBe(true));
  it("extracts an institution for an approved chapter lookup", () => expect(extractInstitutionMention("Does EFF have a chapter at Morgan State University?")).toBe("Morgan State University"));
  it("does not research a simple rewrite", () => expect(needsCurrentResearch("Make this email less formal")).toBe(false));
  it("allows HTTPS action links", () => expect(isSafeActionUrl("https://example.edu/help")).toBe(true));
  it("allows approved mailto links", () => expect(isSafeActionUrl("mailto:nationals@estherfundsinc.org")).toBe(true));
  it("blocks javascript links", () => expect(isSafeActionUrl("javascript:alert(1)")).toBe(false));
  it("removes unknown citation IDs", () => expect(removeUnknownCitationIds("Use [EFF1] and [WEB99].", [{id:"EFF1",title:"Resources",url:"https://portal.estherfundsfoundation.org/resources",sourceType:"eff_resource",accessedAt:"2026-09-07"}])).toBe("Use [EFF1] and ."));
  it("rejects duplicate evidence IDs", () => expect(validateEvidenceSources([{id:"EFF1",title:"A",url:"https://example.edu",sourceType:"external_official",accessedAt:"2026-09-07"},{id:"EFF1",title:"B",url:"https://example.gov",sourceType:"external_official",accessedAt:"2026-09-07"}])).toHaveLength(1));
  it("returns scholarship registry support for scholarship questions", () => expect(relevantPrograms("Help me find a scholarship")[0]?.programId).toBe("scholarship-directory"));
  it("returns belonging resources without forcing funding", () => expect(relevantPrograms("I want sisterhood and community").some((item) => item.programId === "pgws")).toBe(true));
});
