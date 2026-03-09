import { describe, expect, it } from "vitest";
import { createWatchToken, verifyWatchToken } from "../src/security/watch-token.js";

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
});
