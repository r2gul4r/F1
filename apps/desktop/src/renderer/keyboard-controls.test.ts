import { describe, expect, it } from "vitest";
import { getNextSelectedDriverId, isFocusToggleKey } from "./keyboard-controls.js";

describe("desktop keyboard controls", () => {
  it("cycles selected driver in both directions", () => {
    const drivers = ["VER", "NOR", "LEC"];

    expect(getNextSelectedDriverId(drivers, "VER", "next")).toBe("NOR");
    expect(getNextSelectedDriverId(drivers, "VER", "previous")).toBe("LEC");
    expect(getNextSelectedDriverId(drivers, "LEC", "next")).toBe("VER");
  });

  it("falls back to edge driver when current selection is missing", () => {
    const drivers = ["VER", "NOR", "LEC"];

    expect(getNextSelectedDriverId(drivers, null, "next")).toBe("VER");
    expect(getNextSelectedDriverId(drivers, null, "previous")).toBe("LEC");
    expect(getNextSelectedDriverId(drivers, "HAM", "next")).toBe("VER");
  });

  it("recognizes focus toggle key case-insensitively", () => {
    expect(isFocusToggleKey("f")).toBe(true);
    expect(isFocusToggleKey("F")).toBe(true);
    expect(isFocusToggleKey("g")).toBe(false);
  });
});
