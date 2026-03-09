import { describe, expect, it } from "vitest";
import { MockSource } from "../src/sources/mock-source.js";

describe("mock source", () => {
  it("세션과 텔레메트리를 반환함", async () => {
    const source = new MockSource();
    const snapshot = await source.pull();

    expect(snapshot.session.id).toBe("mock-session");
    expect(snapshot.drivers.length).toBeGreaterThan(0);
    expect(snapshot.ticks.length).toBe(snapshot.drivers.length);
  });
});