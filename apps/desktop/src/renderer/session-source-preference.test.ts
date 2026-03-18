import { describe, expect, it } from "vitest";
import {
  DESKTOP_SESSION_SOURCE_STORAGE_KEY,
  normalizePersistedSessionSource,
  resolveInitialSessionSourceOverride,
  shouldPersistSessionSourceOverride
} from "./session-source-preference";

describe("session source preference", () => {
  it("normalizes only local session sources that the desktop shell can switch to", () => {
    expect(normalizePersistedSessionSource("mock-session")).toBe("mock-session");
    expect(normalizePersistedSessionSource("replay-buffer")).toBe("replay-buffer");
    expect(normalizePersistedSessionSource("live-stream")).toBeNull();
    expect(normalizePersistedSessionSource("unknown")).toBeNull();
  });

  it("resolves the initial override from persisted storage", () => {
    expect(resolveInitialSessionSourceOverride(() => "replay-buffer")).toBe("replay-buffer");
    expect(resolveInitialSessionSourceOverride(() => null)).toBeNull();
  });

  it("keeps a stable storage key for the desktop shell boundary", () => {
    expect(DESKTOP_SESSION_SOURCE_STORAGE_KEY).toBe("f1-desktop-session-source");
  });

  it("allows clearing the override to fall back to runtime default", () => {
    expect(shouldPersistSessionSourceOverride("mock-session")).toBe(true);
    expect(shouldPersistSessionSourceOverride(null)).toBe(false);
  });
});
