const sensitivePatterns = [
  /\b\d{3}-\d{2}-\d{4}\b/g,
  /\b(?:\d[ -]*?){13,19}\b/g,
  /\b(?:student|campus)\s*(?:id|number)\s*[:#-]?\s*[a-z0-9-]{5,}\b/gi,
  /\b(?:password|passcode|verification code|otp)\s*[:=-]?\s*\S+/gi,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /\b\+?1?[ .-]?(?:\(\d{3}\)|\d{3})[ .-]?\d{3}[ .-]?\d{4}\b/g,
];

const urgentSafetyPattern = /\b(kill myself|suicid(?:e|al)|end my life|hurt myself|self[- ]?harm|do not want to live|don't want to live)\b/i;
const underagePattern = /\b(i am|i'm|im)\s+(?:1[0-7]|[1-9])\b|\bminor\b/i;
const educationPattern = /\b(colleges?|universit(?:y|ies)|schools?|classes?|courses?|credits?|professors?|advisors?|financial aid|fafsa|scholarships?|tuition|balances?|holds?|register|enroll|degrees?|majors?|minors?|study|exams?|grades?|gpa|transfer|transcripts?|withdraw|drop out|dropout|stop out|probation|satisfactory academic progress|sap appeal|mentors?|campus|dorms?|housing|food|transportation|eff|esther funds|chapters?|ambassadors?|students?|careers?|internships?|resumes?|graduate|graduation|commencement|accommodations?|disability services|student parent|graduate school|master'?s|doctorate|phd)\b/i;

export function containsSensitiveData(value: string) {
  return sensitivePatterns.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  });
}

export function redactForPublicSearch(value: string) {
  let redacted = value;
  for (const pattern of sensitivePatterns) {
    pattern.lastIndex = 0;
    redacted = redacted.replace(pattern, "[redacted]");
  }
  return redacted.replace(/\s+/g, " ").trim().slice(0, 500);
}

export function isUrgentSafetyMessage(value: string) {
  return urgentSafetyPattern.test(value);
}

export function disclosesUnderage(value: string) {
  return underagePattern.test(value);
}

export function isEducationRelated(value: string) {
  return educationPattern.test(value);
}

export function needsCurrentResearch(value: string) {
  return /\b(current|today|latest|deadline|due date|open now|202[5-9]|this semester|this year|policy|requirement|eligibility|graduation requirements|financial aid office|state grant)\b/i.test(value);
}

export function extractInstitutionMention(value: string) {
  const match = value.match(/\b(?:at|for)\s+([a-z0-9&.' -]{2,80}?(?:university|college))\b/i);
  return match?.[1]?.replace(/\s+/g, " ").trim() ?? null;
}

export function isSafeActionUrl(value: string) {
  try {
    const url = new URL(value, "https://portal.estherfundsfoundation.org");
    return ["https:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}
