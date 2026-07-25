import {PDFDocument} from "pdf-lib";
import {describe, expect, it} from "vitest";
import {buildFinancialAidPeerMentorCertificate} from "./financial-aid-certificate";

describe("buildFinancialAidPeerMentorCertificate", () => {
  it("creates a one-page landscape credential with metadata", async () => {
    const bytes = await buildFinancialAidPeerMentorCertificate({
      learnerName: "Jordan Alexandra Williams",
      score: 90,
      completedAt: "2026-07-25T12:00:00.000Z",
      certificateCode: "EFF-FAPM-2026-TEST0001",
    });

    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBe(1);
    expect(document.getTitle()).toContain("Jordan Alexandra Williams");
    expect(document.getAuthor()).toBe("Esther Funds Foundation");
    const {width, height} = document.getPage(0).getSize();
    expect(width).toBeGreaterThan(height);
    expect(bytes.byteLength).toBeGreaterThan(2000);
  });

  it("fits a long learner name without failing", async () => {
    const bytes = await buildFinancialAidPeerMentorCertificate({
      learnerName: "Alexandria Marie Johnson-Washington, III",
      score: 100,
      completedAt: "2026-07-25T12:00:00.000Z",
      certificateCode: "EFF-FAPM-2026-TEST0002",
    });
    expect(bytes.byteLength).toBeGreaterThan(2000);
  });
});
