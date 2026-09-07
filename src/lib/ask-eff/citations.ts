import type {EvidenceSource} from "./schema";
import {isSafeActionUrl} from "./safety";

export function validateEvidenceSources(sources: EvidenceSource[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (!/^(EFF|WEB)\d+$/.test(source.id) || seen.has(source.id) || !isSafeActionUrl(source.url)) return false;
    seen.add(source.id);
    return true;
  });
}

export function removeUnknownCitationIds(answer: string, sources: EvidenceSource[]) {
  const valid = new Set(sources.map((source) => source.id));
  return answer.replace(/\[((?:EFF|WEB)\d+)\]/g, (match, id: string) => valid.has(id) ? match : "");
}
