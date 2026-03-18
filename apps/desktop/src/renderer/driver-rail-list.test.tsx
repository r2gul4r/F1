import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { DriverRailItem } from "./driver-rail";
import { DriverRailList } from "./driver-rail-list";

const items: DriverRailItem[] = [
  {
    driver: { id: "NOR", sessionId: "s1", fullName: "Lando Norris", number: 4, teamName: "McLaren", deepLink: "x" },
    tick: { sessionId: "s1", driverId: "NOR", position: { x: 0, y: 0, z: 0 }, speedKph: 320, lap: 10, rank: 1, timestampMs: 1 },
    isLeader: true,
    freshness: "fresh",
    freshnessLabel: "정상"
  },
  {
    driver: { id: "VER", sessionId: "s1", fullName: "Max Verstappen", number: 1, teamName: "Red Bull", deepLink: "x" },
    tick: { sessionId: "s1", driverId: "VER", position: { x: 0, y: 0, z: 0 }, speedKph: 317, lap: 10, rank: 2, timestampMs: 1 },
    isLeader: false,
    freshness: "stale",
    freshnessLabel: "지연"
  },
  {
    driver: { id: "LEC", sessionId: "s1", fullName: "Charles Leclerc", number: 16, teamName: "Ferrari", deepLink: "x" },
    tick: undefined,
    isLeader: false,
    freshness: "no telemetry",
    freshnessLabel: "미수신"
  }
];

describe("driver rail list", () => {
  it("renders freshness badge classes and active selection state in the mounted markup", () => {
    const onSelectDriver = vi.fn();

    const markup = renderToStaticMarkup(
      <DriverRailList items={items} onSelectDriver={onSelectDriver} selectedDriverId="VER" />
    );

    expect(markup).toContain("driver-pill active");
    expect(markup).toContain("driver-pill-freshness-fresh");
    expect(markup).toContain("driver-pill-freshness-stale");
    expect(markup).toContain("driver-pill-freshness-no-telemetry");
    expect(markup).toContain(">정상<");
    expect(markup).toContain(">지연<");
    expect(markup).toContain(">미수신<");
    expect(markup).toContain(">Leader<");
    expect(markup).toContain(">P-<");
  });
});
