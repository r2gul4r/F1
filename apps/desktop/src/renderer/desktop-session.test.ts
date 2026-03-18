import { describe, expect, it } from "vitest";
import { resolveDesktopSessionAvailability } from "./desktop-session.js";

describe("desktop session adapter", () => {
  it("mock-session source is available", () => {
    expect(
      resolveDesktopSessionAvailability({
        platform: "win32",
        versions: {
          chrome: "1",
          electron: "1",
          node: "1"
        },
        mode: "development",
        dataSource: "mock",
        aiProvider: "disabled",
        publicWebRelay: false,
        sessionSource: "mock-session"
      })
    ).toEqual({
      available: true,
      message: null
    });
  });

  it("non-mock session source returns explicit unavailable guidance", () => {
    const availability = resolveDesktopSessionAvailability({
      platform: "linux",
      versions: {
        chrome: "1",
        electron: "1",
        node: "1"
      },
      mode: "packaged",
      dataSource: "openf1",
      aiProvider: "gemini",
      publicWebRelay: false,
      sessionSource: "replay-buffer"
    });

    expect(availability.available).toBe(false);
    expect(availability.message).toContain("replay-buffer");
  });
});
