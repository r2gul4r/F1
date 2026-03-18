import { describe, expect, it } from "vitest";
import { buildReplaySnapshot } from "./replay-session.js";
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

  it("replay-buffer source is now available", () => {
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

    expect(availability).toEqual({
      available: true,
      message: null
    });
  });

  it("replay session snapshot is fixed and carries prediction history", () => {
    const snapshot = buildReplaySnapshot();

    expect(snapshot.sessionId).toBe("desktop-replay-session");
    expect(snapshot.drivers).toHaveLength(4);
    expect(snapshot.predictions.map((prediction) => prediction.lap)).toEqual([26, 27]);
    expect(snapshot.latestTicksByDriver.NOR?.rank).toBe(1);
  });
});
