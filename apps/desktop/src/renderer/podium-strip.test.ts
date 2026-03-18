import { describe, expect, it } from "vitest";
import type { DriverRailItem } from "./driver-rail";
import { buildPodiumStripItems } from "./podium-strip";

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
    freshness: "fresh",
    freshnessLabel: "정상"
  },
  {
    driver: { id: "LEC", sessionId: "s1", fullName: "Charles Leclerc", number: 16, teamName: "Ferrari", deepLink: "x" },
    tick: { sessionId: "s1", driverId: "LEC", position: { x: 0, y: 0, z: 0 }, speedKph: 311, lap: 10, rank: 3, timestampMs: 1 },
    isLeader: false,
    freshness: "fresh",
    freshnessLabel: "정상"
  },
  {
    driver: { id: "RUS", sessionId: "s1", fullName: "George Russell", number: 63, teamName: "Mercedes", deepLink: "x" },
    tick: { sessionId: "s1", driverId: "RUS", position: { x: 0, y: 0, z: 0 }, speedKph: 305, lap: 10, rank: 4, timestampMs: 1 },
    isLeader: false,
    freshness: "fresh",
    freshnessLabel: "정상"
  }
];

describe("podium strip", () => {
  it("returns the top three drivers in rank order", () => {
    expect(buildPodiumStripItems(items)).toEqual([
      { driverId: "NOR", rank: 1, speedKph: 320 },
      { driverId: "VER", rank: 2, speedKph: 317 },
      { driverId: "LEC", rank: 3, speedKph: 311 }
    ]);
  });
});
