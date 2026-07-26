import {createHash, randomBytes} from "node:crypto";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function createReachClaimToken() {
  const token = randomBytes(32).toString("base64url");
  return {token, tokenHash: hashReachClaimToken(token)};
}

export function hashReachClaimToken(token: string) {
  if (!TOKEN_PATTERN.test(token)) return null;
  return createHash("sha256").update(token).digest("hex");
}
