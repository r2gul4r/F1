import { describe, expect, it } from "vitest";
import { getSupportedLocalSessionSources } from "./session-source-controls.js";

describe("session source controls", () => {
  it("always exposes mock and replay local sources", () => {
    expect(getSupportedLocalSessionSources("mock-session").map((option) => option.key)).toEqual([
      "mock-session",
      "replay-buffer",
      "live-stream"
    ]);
    expect(getSupportedLocalSessionSources("live-stream").map((option) => option.key)).toEqual([
      "mock-session",
      "replay-buffer",
      "live-stream"
    ]);
  });

  it("marks live-stream as an explicit disabled option", () => {
    expect(getSupportedLocalSessionSources("mock-session").find((option) => option.key === "live-stream")).toMatchObject({
      label: "Live stream",
      disabled: true
    });
  });
});
