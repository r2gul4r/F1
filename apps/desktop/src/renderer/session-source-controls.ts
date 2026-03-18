import type { DesktopSessionSource } from "../runtime/runtime-context.js";

export type SessionSourceOption = {
  key: DesktopSessionSource;
  label: string;
  disabled?: boolean;
};

export const getSupportedLocalSessionSources = (
  runtimeSource: DesktopSessionSource
): SessionSourceOption[] => {
  const options: SessionSourceOption[] = [
    { key: "mock-session", label: "Mock session" },
    { key: "replay-buffer", label: "Replay session" },
    { key: "live-stream", label: "Live stream", disabled: true }
  ];

  return options;
};
