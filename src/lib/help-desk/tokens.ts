import {createHash, createHmac, timingSafeEqual} from "node:crypto";

function secret() {
  return process.env.HELP_DESK_TOKEN_SECRET || process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function hashHelpDeskToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createHelpDeskToken(caseId: string) {
  const key = secret();
  if (!key) throw new Error("Help Desk token secret is not configured.");
  const signature = createHmac("sha256", key).update(caseId).digest("base64url");
  return `${caseId}.${signature}`;
}

export function verifyHelpDeskToken(token: string) {
  const [caseId, provided] = token.split(".");
  if (!caseId || !provided || !/^[0-9a-f-]{36}$/i.test(caseId)) return null;
  const expected = createHelpDeskToken(caseId).split(".")[1];
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return {caseId, tokenHash: hashHelpDeskToken(token)};
}
