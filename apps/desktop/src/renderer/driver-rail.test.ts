import { describe, expect, it } from "vitest";
import type { Driver, SessionSnapshot } from "@f1/core";
import { buildDriverRailItems } from "./driver-rail.js";

const sessionId = "desktop-session";

const drivers: Driver[] = [
  { id: "VER", sessionId, fullName: "Max Verstappen", number: 1, teamName: "Red Bull", deepLink: "https://example.com/ver" },
  { id: "NOR", sessionId, fullName: "Lando Norris", number: 4, teamName: "McLaren", deepLink: "https://example.com/nor" },
  { id: "LEC", sessionId, fullName: "Charles Leclerc", number: 16, teamName: "Ferrari", deepLink: "https://example.com/lec" }
];

const createSnapshot = (): SessionSnapshot => ({
  sessionId,
  drivers,
  latestTicksByDriver: {
    VER: {
      sessionId,
      driverId: "VER",
      position: { x: 0, y: 0, z: 0 },
      speedKph: 320,
      lap: 12,
      rank: 2,
      timestampMs: 1000
    },
    NOR: {
      sessionId,
      driverId: "NOR",
      position: { x: 0, y: 0, z: 0 },
      speedKph: 322,
      lap: 12,
      rank: 1,
      timestampMs: 1000
    }
  },
  flag: null,
  predictions: []
});

describe("driver rail", () => {
  it("orders drivers by live rank before static number", () => {
    const items = buildDriverRailItems(createSnapshot(), {
      nowMs: 1_500,
      telemetryStaleMs: 15_000
    });

    expect(items.map((item) => item.driver.id)).toEqual(["NOR", "VER", "LEC"]);
    expect(items[0]?.isLeader).toBe(true);
    expect(items[0]?.freshness).toBe("fresh");
    expect(items[0]?.freshnessLabel).toBe("정상");
  });

  it("falls back to driver number when telemetry rank is missing", () => {
    const snapshot = createSnapshot();
    snapshot.latestTicksByDriver = {};

    const items = buildDriverRailItems(snapshot, {
      nowMs: 1_500,
      telemetryStaleMs: 15_000
    });
    expect(items.map((item) => item.driver.id)).toEqual(["VER", "NOR", "LEC"]);
    expect(items.every((item) => item.isLeader === false)).toBe(true);
    expect(items[0]?.freshness).toBe("no telemetry");
    expect(items[0]?.freshnessLabel).toBe("미수신");
  });

  it("exposes stale freshness when telemetry age crosses the configured threshold", () => {
    const items = buildDriverRailItems(createSnapshot(), {
      nowMs: 20_000,
      telemetryStaleMs: 15_000
    });

    expect(items.find((item) => item.driver.id === "NOR")).toMatchObject({
      freshness: "stale",
      freshnessLabel: "지연"
    });
  });
});
