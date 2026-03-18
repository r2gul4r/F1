import { describe, expect, it } from "vitest";
import { buildReplayDemoSnapshot } from "@f1/core";
import { resolveDesktopSessionAvailability } from "./desktop-session.js";

const sessionSourceOptions = [
  { key: "mock-session", label: "Mock session", disabled: false, disabledReason: null },
  { key: "replay-buffer", label: "Replay session", disabled: false, disabledReason: null },
  {
    key: "live-stream",
    label: "Live stream",
    disabled: true,
    disabledReason: "local live-stream adapter is not wired yet."
  }
] as const;

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
        sessionSource: "mock-session",
        sessionSourceOptions: [...sessionSourceOptions]
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
      sessionSource: "replay-buffer",
      sessionSourceOptions: [...sessionSourceOptions]
    });

    expect(availability).toEqual({
      available: true,
      message: null
    });
  });

  it("disabled source는 runtime contract의 disabled reason으로 unavailable을 설명함", () => {
    const availability = resolveDesktopSessionAvailability({
      platform: "linux",
      versions: {
        chrome: "1",
        electron: "1",
        node: "1"
      },
      mode: "development",
      dataSource: "openf1",
      aiProvider: "ollama",
      publicWebRelay: false,
      sessionSource: "live-stream",
      sessionSourceOptions: [...sessionSourceOptions]
    });

    expect(availability).toEqual({
      available: false,
      message: "local live-stream adapter is not wired yet."
    });
  });

  it("enabled source라도 명시적 adapter가 없으면 fail-open하지 않음", () => {
    const availability = resolveDesktopSessionAvailability({
      platform: "linux",
      versions: {
        chrome: "1",
        electron: "1",
        node: "1"
      },
      mode: "development",
      dataSource: "openf1",
      aiProvider: "ollama",
      publicWebRelay: false,
      sessionSource: "live-stream",
      sessionSourceOptions: [
        { key: "mock-session", label: "Mock session", disabled: false, disabledReason: null },
        { key: "replay-buffer", label: "Replay session", disabled: false, disabledReason: null },
        { key: "live-stream", label: "Live stream", disabled: false, disabledReason: null }
      ]
    });

    expect(availability).toEqual({
      available: false,
      message: "Live stream adapter is not wired yet."
    });
  });

  it("runtime contract가 wired local source를 disabled로 표시하면 adapter보다 contract를 우선함", () => {
    const mockAvailability = resolveDesktopSessionAvailability({
      platform: "linux",
      versions: {
        chrome: "1",
        electron: "1",
        node: "1"
      },
      mode: "development",
      dataSource: "mock",
      aiProvider: "disabled",
      publicWebRelay: false,
      sessionSource: "mock-session",
      sessionSourceOptions: [
        { key: "mock-session", label: "Mock session", disabled: true, disabledReason: "mock session is disabled." },
        { key: "replay-buffer", label: "Replay session", disabled: false, disabledReason: null },
        { key: "live-stream", label: "Live stream", disabled: true, disabledReason: "local live-stream adapter is not wired yet." }
      ]
    });

    const replayAvailability = resolveDesktopSessionAvailability({
      platform: "linux",
      versions: {
        chrome: "1",
        electron: "1",
        node: "1"
      },
      mode: "development",
      dataSource: "openf1",
      aiProvider: "gemini",
      publicWebRelay: false,
      sessionSource: "replay-buffer",
      sessionSourceOptions: [
        { key: "mock-session", label: "Mock session", disabled: false, disabledReason: null },
        { key: "replay-buffer", label: "Replay session", disabled: true, disabledReason: "replay session is disabled." },
        { key: "live-stream", label: "Live stream", disabled: true, disabledReason: "local live-stream adapter is not wired yet." }
      ]
    });

    expect(mockAvailability).toEqual({
      available: false,
      message: "mock session is disabled."
    });
    expect(replayAvailability).toEqual({
      available: false,
      message: "replay session is disabled."
    });
  });

  it("replay session snapshot is fixed and carries prediction history", () => {
    const snapshot = buildReplayDemoSnapshot();

    expect(snapshot.sessionId).toBe("desktop-replay-session");
    expect(snapshot.drivers).toHaveLength(4);
    expect(snapshot.predictions.map((prediction) => prediction.lap)).toEqual([26, 27]);
    expect(snapshot.latestTicksByDriver.NOR?.rank).toBe(1);
  });
});
