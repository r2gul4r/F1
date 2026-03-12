import { describe, expect, it } from "vitest";
import { createWatchToken, readWatchToken, verifyWatchToken } from "../src/security/watch-token.js";

describe("watch token", () => {
  it("유효한 토큰은 검증됨", () => {
    const token = createWatchToken("secret-key-for-test-1234567890", 60);
    expect(verifyWatchToken(token, "secret-key-for-test-1234567890")).toBe(true);
  });

  it("만료된 토큰은 거부됨", async () => {
    const token = createWatchToken("secret-key-for-test-1234567890", 0);
    await new Promise((resolve) => setTimeout(resolve, 1));
    expect(verifyWatchToken(token, "secret-key-for-test-1234567890")).toBe(false);
  });

  it("OAuth 세션 정보를 토큰에 보존함", () => {
    const token = createWatchToken("secret-key-for-test-1234567890", 60, {
      kind: "oauth",
      userId: "user-1",
      displayName: "Ray"
    });

    const payload = readWatchToken(token, "secret-key-for-test-1234567890");

    expect(payload).toMatchObject({
      scope: "watch",
      session: {
        kind: "oauth",
        userId: "user-1",
        displayName: "Ray"
      }
    });
    expect(payload?.exp).toBeGreaterThan(payload?.iat ?? 0);
  });

  it("세션 정보가 없으면 anonymous 세션으로 발급됨", () => {
    const token = createWatchToken("secret-key-for-test-1234567890", 60);
    const payload = readWatchToken(token, "secret-key-for-test-1234567890");

    expect(payload?.session).toEqual({
      kind: "anonymous"
    });
  });
});
