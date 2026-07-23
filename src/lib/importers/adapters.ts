import type { ParsedScholarship, SourceAdapter } from "./types";
import { RESOURCE_SOURCES } from "./catalog";

const entities: Record<string, string> = {
  amp: "&",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  ldquo: "“",
  rdquo: "”",
  rsquo: "’",
  bull: "•",
};

export const cleanText = (value: string) =>
  value
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(
      /&(#x?[0-9a-f]+|[a-z]+);/gi,
      (_, entity: string) => {
        if (entity[0] === "#") {
          const hex = entity[1]?.toLowerCase() === "x";
          return String.fromCodePoint(
            parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10),
          );
        }
        return entities[entity.toLowerCase()] ?? `&${entity};`;
      },
    )
    .replace(/\s+/g, " ")
    .trim();

const links = (html: string) =>
  [
    ...html.matchAll(
      /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    ),
  ].map((match) => ({
    url: match[1],
    label: cleanText(match[2]),
    index: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));

const absolute = (url: string, base: string) => {
  try {
    const parsed = new URL(url, base);
    return /^https?:$/.test(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return "";
  }
};

const amountFrom = (title: string, body = "") =>
  cleanText(`${title} ${body}`).match(
    /\$[\d,]+(?:\.\d{2})?(?:\s*(?:–|-|to)\s*\$?[\d,]+(?:\.\d{2})?)?/i,
  )?.[0] ?? null;

const isNonScholarshipPromotion = (title: string) =>
  /\b(?:sweepstakes|survey|giveaway|challenge|raffle|contest)\b/i.test(title) &&
  !/\bscholarship\b/i.test(title);

function deadlineFrom(value: string) {
  const text = cleanText(value);
  return (
    text
      .match(
        /(?:deadline|closing date|closes|\bdue)\s*:?\s*\(?([A-Za-z]+\s+\d{1,2}(?:,\s*\d{4})?|(?:rolling|ongoing|monthly|varies|various|see (?:site|website)))(?=\)?(?:\s|$|[.;|•]))/i,
      )?.[1]
      ?.trim() ?? "varies"
  );
}

function sourceSections(html: string, fallbackUrl: string) {
  const sections = [
    ...html.matchAll(
      /<section\s+data-eff-source-url=["']([^"']+)["']>([\s\S]*?)<\/section>/gi,
    ),
  ];
  return sections.length
    ? sections.map((match) => ({
        sourceUrl: absolute(match[1], fallbackUrl) || fallbackUrl,
        html: match[2],
      }))
    : [{ sourceUrl: fallbackUrl, html }];
}

export const scholarshipCollectiveAdapter: SourceAdapter = {
  key: "scholarship_collective",
  parse(html, sourceUrl) {
    const found: ParsedScholarship[] = [];

    for (const section of sourceSections(html, sourceUrl)) {
      let level = "all";
      const markers = [
        ...section.html.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi),
      ].map((match) => ({
        at: match.index ?? 0,
        label: cleanText(match[1]),
      }));

      for (const link of links(section.html)) {
        for (const marker of markers) {
          if (marker.at > link.index) break;
          if (/high school|undergraduate|graduate|international/i.test(marker.label)) {
            level = marker.label.toLowerCase();
          }
        }

        const context = section.html.slice(
          Math.max(0, link.index - 180),
          link.end + 420,
        );
        const deadline = deadlineFrom(context);
        const url = absolute(link.url, section.sourceUrl);
        const title = link.label;
        const amount = amountFrom(title, context);
        const looksLikeOpportunity =
          /scholarship|award|grant|fellowship/i.test(title) ||
          (deadline !== "varies" && Boolean(amount));

        if (
          !url ||
          title.length < 4 ||
          isNonScholarshipPromotion(title) ||
          !looksLikeOpportunity ||
          /apply now|learn more|money list|download|newsletter/i.test(title)
        ) {
          continue;
        }

        found.push({
          title,
          sponsor: null,
          amountText: amount,
          deadlineText: deadline,
          originalUrl: url,
          sourceUrl: section.sourceUrl,
          academicLevels: [level],
        });
      }
    }

    return found;
  },
};

function parseJlvBlocks(html: string, sourceUrl: string) {
  const results: ParsedScholarship[] = [];
  const blocks = html.match(/<(?:p|li)\b[^>]*>[\s\S]*?<\/(?:p|li)>/gi) ?? [];

  for (const block of blocks) {
    const firstLink = links(block).find(
      (item) =>
        item.label.length >= 4 &&
        !/facebook|twitter|pinterest|subscribe|share|read more/i.test(
          item.label,
        ),
    );
    if (!firstLink || isNonScholarshipPromotion(firstLink.label)) continue;

    const text = cleanText(block);
    const deadline = deadlineFrom(text);
    if (deadline === "varies" && !/scholarship|award|grant|fellowship/i.test(firstLink.label)) {
      continue;
    }

    const sponsor =
      text
        .match(
          /Sponsor\s*:\s*(.+?)(?=\s+(?:Amount|Award|Deadline|Closing Date|Closes|Description)\s*:|$)/i,
        )?.[1]
        ?.trim() ?? null;

    results.push({
      title: firstLink.label,
      sponsor,
      amountText: amountFrom("", text),
      deadlineText: deadline,
      originalUrl: absolute(firstLink.url, sourceUrl),
      sourceUrl,
    });
  }

  if (results.length) return results;

  for (const block of html.split(/<h[234][^>]*>/i).slice(1)) {
    const heading = block.match(/^([\s\S]*?)<\/h[234]>/i);
    if (!heading) continue;
    const title = cleanText(heading[1]);
    if (
      !/scholarship|award|grant|fellowship/i.test(title) ||
      isNonScholarshipPromotion(title)
    ) {
      continue;
    }
    const body = block.slice(heading[0].length, heading[0].length + 1800);
    const link = links(body).find(
      (item) => !/facebook|twitter|pinterest|subscribe/i.test(item.label),
    );
    if (!link) continue;
    results.push({
      title,
      sponsor: null,
      amountText: amountFrom(title, body),
      deadlineText: deadlineFrom(body),
      originalUrl: absolute(link.url, sourceUrl),
      sourceUrl,
    });
  }

  return results;
}

export const jlvAdapter: SourceAdapter = {
  key: "jlv_college_counseling",
  parse(html, sourceUrl) {
    const decoded = html
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&");

    return sourceSections(decoded, sourceUrl).flatMap((section) =>
      parseJlvBlocks(section.html, section.sourceUrl),
    );
  },
};

const providerProgram = (
  key: string,
  title: string,
  sponsor: string,
  tags: string[],
  levels: string[],
  preferredLink: RegExp,
): SourceAdapter => ({
  key,
  parse(html, sourceUrl) {
    const link = links(html).find((item) => preferredLink.test(item.label));
    if (
      !link &&
      !cleanText(html).toLowerCase().includes(title.toLowerCase().split(" ")[0])
    ) {
      return [];
    }
    return [
      {
        title,
        sponsor,
        amountText: null,
        deadlineText: "varies",
        originalUrl: absolute(link?.url ?? sourceUrl, sourceUrl),
        sourceUrl,
        academicLevels: levels,
        categoryTags: tags,
      },
    ];
  },
});

export const uncfAdapter: SourceAdapter = {
  key: "uncf",
  parse(html, sourceUrl) {
    const results: ParsedScholarship[] = [];

    for (const section of sourceSections(html, sourceUrl)) {
      for (const link of links(section.html).filter(
        (item) =>
          /opportunities\.uncf\.org|scholarships\.uncf\.org/i.test(item.url) &&
          !/apply for a scholarship|scholarship portal/i.test(item.label),
      )) {
        const context = section.html.slice(link.end, link.end + 1000);
        const deadline = deadlineFrom(context);
        if (link.label.length < 8 || isNonScholarshipPromotion(link.label)) {
          continue;
        }
        results.push({
          title: link.label,
          sponsor: "UNCF",
          amountText: amountFrom(link.label, context),
          deadlineText: deadline,
          originalUrl: absolute(link.url, section.sourceUrl),
          sourceUrl: section.sourceUrl,
          academicLevels: ["undergraduate", "graduate"],
          categoryTags: ["black-hbcu"],
        });
      }
    }

    return results;
  },
};

const jkcfAdapter: SourceAdapter = {
  key: "jack_kent_cooke",
  parse(html, sourceUrl) {
    const results: ParsedScholarship[] = [];
    for (const block of html.split(/<h3[^>]*>/i).slice(1)) {
      const heading = block.match(/^([\s\S]*?)<\/h3>/i);
      if (!heading) continue;
      const title = cleanText(heading[1]);
      if (
        !/Young Scholars Program|College Scholarship Program|Undergraduate Transfer Scholarship/i.test(
          title,
        )
      ) {
        continue;
      }
      const body = block.slice(heading[0].length, heading[0].length + 2200);
      const period = cleanText(body).match(
        /Application Period\s+([A-Za-z]+\s+\d{1,2},\s*\d{4})\s*[-–]\s*([A-Za-z]+\s+\d{1,2},\s*\d{4})/i,
      );
      const link = links(body).find((item) =>
        /learn more|apply|notify/i.test(item.label),
      );
      if (!period || !link) continue;
      results.push({
        title,
        sponsor: "Jack Kent Cooke Foundation",
        amountText: amountFrom("", body),
        deadlineText: period[2],
        originalUrl: absolute(link.url, sourceUrl),
        sourceUrl,
        academicLevels: /Young Scholars/i.test(title)
          ? ["middle school", "high school"]
          : /Transfer/i.test(title)
            ? ["undergraduate"]
            : ["high school"],
        categoryTags: ["first-gen", "high-achieving"],
      });
    }
    return results;
  },
};

const sweAdapter: SourceAdapter = {
  key: "swe",
  parse(html, sourceUrl) {
    if (/Now CLOSED for the 26-27 Academic Year/i.test(cleanText(html))) {
      return [];
    }
    return providerProgram(
      "swe",
      "SWE Scholarships",
      "Society of Women Engineers",
      ["women", "stem-health-trades"],
      ["high school", "undergraduate", "graduate"],
      /apply for a swe scholarship|apply now/i,
    ).parse(html, sourceUrl);
  },
};

const directAdapters: Record<string, SourceAdapter> = {
  uncf: uncfAdapter,
  tmcf: providerProgram(
    "tmcf",
    "TMCF Open Scholarships",
    "Thurgood Marshall College Fund",
    ["black-hbcu"],
    ["high school", "undergraduate", "graduate"],
    /open scholarships|access scholarships portal/i,
  ),
  swe: sweAdapter,
  jack_kent_cooke: jkcfAdapter,
  hsf: providerProgram(
    "hsf",
    "HSF Scholar Program",
    "Hispanic Scholarship Fund",
    ["heritage-immigrant", "first-gen"],
    ["high school", "undergraduate", "graduate"],
    /scholar program|apply now/i,
  ),
};

export function adapterFor(key: string) {
  if (key === scholarshipCollectiveAdapter.key) {
    return scholarshipCollectiveAdapter;
  }
  if (key === jlvAdapter.key) return jlvAdapter;
  if (directAdapters[key]) return directAdapters[key];
  const resource = RESOURCE_SOURCES.find((item) => item.key === key);
  if (resource) {
    return providerProgram(
      resource.key,
      resource.name,
      resource.name,
      resource.tags,
      resource.levels,
      /scholarship|apply|program|finder|search/i,
    );
  }
  throw new Error(`Unknown source adapter: ${key}`);
}
