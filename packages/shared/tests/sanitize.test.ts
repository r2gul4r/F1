import { describe, expect, it } from "vitest";
import { sanitizeUserHtml } from "../src/security/sanitize.js";

describe("sanitizeUserHtml", () => {
  it("스크립트를 제거함", () => {
    const result = sanitizeUserHtml("<div>safe</div><script>alert(1)</script>");
    expect(result).toBe("safe");
  });
});