export type SafetyClassification = {
  level: "routine" | "priority" | "urgent" | "safety";
  safety: boolean;
  conduct: boolean;
  privacy: boolean;
  reasons: string[];
};

const safetyPatterns = [
  /\b(kill|hurt|harm) myself\b/i,
  /\b(suicide|suicidal|self[- ]?harm)\b/i,
  /\bend my life\b/i,
  /\b(do not|don'?t) want to (live|be alive)\b/i,
  /\bno point in living\b/i,
  /\boverdose\b/i,
  /\babout to (jump|shoot|cut)\b/i,
];
const dangerPatterns = [/\bgun\b/i,/\bweapon\b/i,/\bthreat(en|ening)?\b/i,/\bstalking\b/i,/\bimmediate danger\b/i,/\bbeing attacked\b/i];
const conductPatterns = [/\bsexual\b/i,/\bnude(s)?\b/i,/\bfuck you\b/i,/\bslur\b/i,/\bi will (find|hurt|kill) you\b/i];
const privacyPatterns = [
  /\b\d{3}-\d{2}-\d{4}\b/,
  /\b(ssn|social security)\b/i,
  /\b(password|passcode|verification code|recovery code)\b/i,
  /\b(bank account|routing number|credit card|debit card)\b/i,
  /\btax return\b/i,
];
const urgencyPatterns = [/\b(today|tonight|tomorrow|within 24 hours|within 48 hours|evict|locked out|dropped from classes)\b/i];

export function classifyHelpDeskMessage(text: string): SafetyClassification {
  const safety = safetyPatterns.some(pattern => pattern.test(text));
  const danger = dangerPatterns.some(pattern => pattern.test(text));
  const conduct = conductPatterns.some(pattern => pattern.test(text));
  const privacy = privacyPatterns.some(pattern => pattern.test(text));
  const urgent = urgencyPatterns.some(pattern => pattern.test(text));
  const reasons = [
    safety ? "self-harm or suicide language" : null,
    danger ? "immediate-danger or threat language" : null,
    conduct ? "potentially inappropriate or threatening conduct" : null,
    privacy ? "possible sensitive information" : null,
    urgent ? "time-sensitive consequence" : null,
  ].filter(Boolean) as string[];
  return {
    level: safety || danger ? "safety" : conduct || privacy || urgent ? "urgent" : "routine",
    safety: safety || danger,
    conduct,
    privacy,
    reasons,
  };
}

export const SAFETY_RESPONSE = `Your safety matters more than this school issue. EFF volunteers are not crisis counselors and cannot safely manage an immediate safety situation in chat.

If you may be in immediate danger, call 911 now. If you are thinking about suicide, self-harm, or are in a mental-health crisis, call or text 988 to reach the Suicide & Crisis Lifeline. If you need local food, shelter, or essential-needs referrals, dial 211.

This conversation has been placed in a safety hold and EFF leadership has been alerted. Please do not wait for a Help Desk volunteer before contacting emergency or crisis support.`;

export const PRIVACY_RESPONSE = `For your protection, do not send Social Security numbers, passwords, verification codes, tax returns, full financial account details, medical records, or unredacted identity documents in this chat. If you shared a password or code, change it immediately. EFF will provide secure instructions if an authorized reviewer truly needs a document.`;

export const CONDUCT_RESPONSE = `EFF is committed to a respectful, safe Help Desk for students and volunteers. Threatening, sexual, hateful, coercive, or personally targeted messages are not permitted. This conversation has been flagged for National Office review, and the volunteer will not continue ordinary chat while that review is pending.`;
