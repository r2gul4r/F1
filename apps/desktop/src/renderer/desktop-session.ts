import type { DesktopRuntimeContext } from "../runtime/runtime-context.js";
import { useMockSession } from "./mock-session";
import { useReplaySession } from "./replay-session";

export type DesktopSessionAvailability = {
  available: boolean;
  message: string | null;
};

export type DesktopSessionState =
  | ({
      kind: "ready";
    } & ReturnType<typeof useMockSession>)
  | {
      kind: "unavailable";
      message: string;
      sessionSource: DesktopRuntimeContext["sessionSource"];
    };

export const resolveDesktopSessionAvailability = (
  runtime: DesktopRuntimeContext
): DesktopSessionAvailability => {
  if (runtime.sessionSource === "mock-session" || runtime.sessionSource === "replay-buffer") {
    return {
      available: true,
      message: null
    };
  }

  if (runtime.sessionSource === "live-stream") {
    return {
      available: false,
      message: "live-stream session source wiring is not connected yet."
    };
  }

  return {
    available: false,
    message: "desktop session source is not configured."
  };
};

export const useDesktopSession = (runtime: DesktopRuntimeContext): DesktopSessionState => {
  const availability = resolveDesktopSessionAvailability(runtime);
  const mockSession = useMockSession(runtime.sessionSource === "mock-session");
  const replaySession = useReplaySession(runtime.sessionSource === "replay-buffer");

  if (!availability.available) {
    return {
      kind: "unavailable",
      message: availability.message ?? "desktop session source is unavailable.",
      sessionSource: runtime.sessionSource
    };
  }

  return {
    kind: "ready",
    ...(runtime.sessionSource === "replay-buffer" ? replaySession : mockSession)
  };
};
