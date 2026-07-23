import { describe, expect, it } from "vitest";
import {
  jlvAdapter,
  scholarshipCollectiveAdapter,
  uncfAdapter,
} from "./adapters";

describe("trusted source adapters", () => {
  it("extracts current Scholarship Collective titles, links, levels, and due dates", () => {
    const rows = scholarshipCollectiveAdapter.parse(
      `
        <h2>Undergraduate</h2>
        <a href="https://provider.test/apply">Future Leaders Scholarship</a>
        <p>(due August 15, 2026)</p>
        <a href="https://provider.test/survey">Local Survey Sweepstakes</a>
        <p>(due August 31, 2026)</p>
      `,
      "https://source.test",
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      title: "Future Leaders Scholarship",
      deadlineText: "August 15, 2026",
      academicLevels: ["undergraduate"],
    });
    expect(rows[0].originalUrl).toContain("provider.test/apply");
  });

  it("extracts structured JLV fields from current Scholarship Saturday markup", () => {
    const rows = jlvAdapter.parse(
      `
        <section data-eff-source-url="https://jlv.test/2026/07/18/post/">
          <p>
            <strong><a href="https://provider.test/apply">Community Scholars Award</a></strong><br>
            <strong>Sponsor:</strong> Community Foundation<br>
            <strong>Amount:</strong> $2,000<br>
            <strong>Closing Date:</strong> August 15, 2026<br>
            <strong>Description:</strong> Current undergraduate students may apply.
          </p>
        </section>
      `,
      "https://jlv.test/scholarships",
    );

    expect(rows[0]).toMatchObject({
      title: "Community Scholars Award",
      sponsor: "Community Foundation",
      amountText: "$2,000",
      deadlineText: "August 15, 2026",
      sourceUrl: "https://jlv.test/2026/07/18/post/",
    });
  });

  it("extracts current UNCF program links and 'Closes' deadlines", () => {
    const rows = uncfAdapter.parse(
      `
        <a href="https://opportunities.uncf.org/s/program-landing-page?id=current">
          2026-2027 MetLife Foundation Legacy Endowed Scholarship
        </a>
        <p>Renewable merit-based scholarships of up to $5,000/year. Closes July 31.</p>
      `,
      "https://uncf.org/the-latest/scholarships-for-july-at-uncf",
    );

    expect(rows[0]).toMatchObject({
      title: "2026-2027 MetLife Foundation Legacy Endowed Scholarship",
      sponsor: "UNCF",
      amountText: "$5,000",
      deadlineText: "July 31",
    });
    expect(rows[0].originalUrl).toContain(
      "opportunities.uncf.org/s/program-landing-page?id=current",
    );
  });

  it("ignores navigation, unsafe links, and non-scholarship promotions", () => {
    const rows = scholarshipCollectiveAdapter.parse(
      `
        <script>Fake Scholarship</script>
        <a href="javascript:alert(1)">Bad Scholarship</a>
        <a href="/about">About us</a>
        <a href="https://provider.test/survey">Local Survey Sweepstakes</a>
        <p>Due August 31, 2026</p>
      `,
      "https://source.test",
    );
    expect(rows).toEqual([]);
  });

  it("does not import general JLV advice posts", () => {
    expect(
      jlvAdapter.parse(
        '<h3>How to choose a college</h3><p>Helpful advice.</p><a href="/article">Read</a>',
        "https://jlv.test/post",
      ),
    ).toEqual([]);
  });
});
