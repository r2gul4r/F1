import { describe, expect, it } from "vitest";
import type { DesktopRuntimeContext } from "../runtime/runtime-context.js";
import { buildSessionSourceRecoveryMessage, getSupportedLocalSessionSources } from "./session-source-controls.js";

const runtime: Pick<DesktopRuntimeContext, "sessionSourceOptions"> = {
  sessionSourceOptions: [
    { key: "mock-session", label: "Mock session", disabled: false, disabledReason: null },
    { key: "replay-buffer", label: "Replay session", disabled: false, disabledReason: null },
    {
      key: "live-stream",
      label: "Live stream",
      disabled: true,
      disabledReason: "local live-stream adapter is not wired yet."
    }
  ]
};

describe("session source controls", () => {
  it("reflects the runtime contract order instead of hardcoding local source keys", () => {
    expect(getSupportedLocalSessionSources(runtime).map((option) => option.key)).toEqual([
      "mock-session",
      "replay-buffer",
      "live-stream"
    ]);
  });

  it("preserves the runtime contract disabled reason for unavailable sources", () => {
    expect(getSupportedLocalSessionSources(runtime).find((option) => option.key === "live-stream")).toMatchObject({
      label: "Live stream",
      disabled: true,
      disabledReason: "local live-stream adapter is not wired yet."
    });
  });

  it("builds recovery guidance from the enabled runtime options instead of hardcoding source names", () => {
    expect(buildSessionSourceRecoveryMessage({ ...runtime, sessionSource: "mock-session", currentSource: "live-stream" })).toBe(
      "Available local sources: `mock-session`, `replay-buffer`. Clear the override to follow the runtime default or switch to one of these sources."
    );
  });

  it("returns an explicit unavailable message when the runtime contract exposes no enabled local sources", () => {
    expect(
      buildSessionSourceRecoveryMessage({
        sessionSource: "live-stream",
        currentSource: "live-stream",
        sessionSourceOptions: [
          { key: "live-stream", label: "Live stream", disabled: true, disabledReason: "local live-stream adapter is not wired yet." }
        ]
      })
    ).toBe("No local session sources are currently available in this runtime contract.");
  });

  it("suppresses runtime-default guidance when the default source is already current or disabled", () => {
    expect(buildSessionSourceRecoveryMessage({ ...runtime, sessionSource: "mock-session", currentSource: "mock-session" })).toBe(
      "Available local sources: `mock-session`, `replay-buffer`. Switch to one of these sources."
    );

    expect(
      buildSessionSourceRecoveryMessage({
        sessionSource: "mock-session",
        currentSource: "live-stream",
        sessionSourceOptions: [
          { key: "mock-session", label: "Mock session", disabled: true, disabledReason: "mock session is disabled." },
          { key: "replay-buffer", label: "Replay session", disabled: false, disabledReason: null },
          { key: "live-stream", label: "Live stream", disabled: true, disabledReason: "local live-stream adapter is not wired yet." }
        ]
      })
    ).toBe("Available local sources: `replay-buffer`. Switch to one of these sources.");
  });
});
