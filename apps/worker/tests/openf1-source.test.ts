import { describe, expect, it } from "vitest";
import { buildOpenF1Headers } from "../src/sources/openf1-source.js";

describe("openf1 source", () => {
  it("api 키 헤더를 생성함", () => {
    const headers = buildOpenF1Headers("sample-key");

    expect(headers.authorization).toBe("Bearer sample-key");
    expect(headers["x-api-key"]).toBe("sample-key");
  });
});
