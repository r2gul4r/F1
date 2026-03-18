import type { DesktopSessionSource } from "../runtime/runtime-context.js";

export const DESKTOP_SESSION_SOURCE_STORAGE_KEY = "f1-desktop-session-source";

export const normalizePersistedSessionSource = (
  value: string | null | undefined
): DesktopSessionSource | null => {
  if (value === "mock-session" || value === "replay-buffer") {
    return value;
  }

  return null;
};

export const resolveInitialSessionSourceOverride = (
  readValue: () => string | null
): DesktopSessionSource | null => normalizePersistedSessionSource(readValue());

export const shouldPersistSessionSourceOverride = (
  value: DesktopSessionSource | null
): value is DesktopSessionSource => value !== null;
