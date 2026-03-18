import { describe, expect, it } from "vitest";
import type { Driver, TelemetryTick } from "@f1/core";
import { buildSelectedDriverDetails } from "./selected-driver-details";

const driver: Driver = {
  id: "NOR",
  sessionId: "s1",
  fullName: "Lando Norris",
  number: 4,
  teamName: "McLaren",
  deepLink: "x"
};

const tick: TelemetryTick = {
  sessionId: "s1",
  driverId: "NOR",
  position: { x: 0, y: 0, z: 0 },
  speedKph: 318,
  lap: 27,
  rank: 2,
  timestampMs: 1
};

describe("selected driver details", () => {
  it("builds deterministic display details from the selected driver and tick", () => {
    expect(buildSelectedDriverDetails(driver, tick)).toEqual([
      { label: "Gap", value: "+1.8s" },
      { label: "Interval", value: "0.8s" },
      { label: "Gear", value: "G8" },
      { label: "RPM", value: "11380" },
      { label: "Tire", value: "Medium" }
    ]);
  });

  it("returns no details when the selected telemetry is missing", () => {
    expect(buildSelectedDriverDetails(driver, undefined)).toEqual([]);
  });
});
