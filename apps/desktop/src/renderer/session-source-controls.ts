import type { DesktopSessionSource } from "../runtime/runtime-context.js";

export type SessionSourceOption = {
  key: DesktopSessionSource;
  label: string;
};

export const getSupportedLocalSessionSources = (
  runtimeSource: DesktopSessionSource
): SessionSourceOption[] => {
  const options: SessionSourceOption[] = [
    { key: "mock-session", label: "Mock session" },
    { key: "replay-buffer", label: "Replay session" }
  ];

  if (runtimeSource === "live-stream" || runtimeSource === "unknown") {
    return options;
  }

  return options;
};
