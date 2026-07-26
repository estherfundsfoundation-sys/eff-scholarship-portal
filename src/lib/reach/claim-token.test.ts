import {describe, expect, it} from "vitest";
import {createReachClaimToken, hashReachClaimToken} from "./claim-token";

describe("REACH ambassador claim tokens", () => {
  it("creates URL-safe, one-time token material", () => {
    const first = createReachClaimToken();
    const second = createReachClaimToken();

    expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).not.toBe(second.tokenHash);
  });

  it("hashes only correctly shaped tokens", () => {
    const {token, tokenHash} = createReachClaimToken();

    expect(hashReachClaimToken(token)).toBe(tokenHash);
    expect(hashReachClaimToken("not-a-valid-token")).toBeNull();
  });
});
