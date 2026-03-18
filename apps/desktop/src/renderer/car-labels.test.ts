import { describe, expect, it } from "vitest";
import type { CarState } from "@f1/core";
import { buildCarLabels } from "./car-labels.js";

const createCar = (input: {
  driverId: string;
  rank: number;
  selected?: boolean;
}): CarState => ({
  driverId: input.driverId,
  rank: input.rank,
  speedKph: 300,
  position: { x: 0, y: 0, z: 0 },
  smoothedPosition: { x: 0, y: 0, z: 0 },
  freshness: "fresh",
  visual: {
    selected: input.selected ?? false,
    focus: input.selected ?? false,
    haloOpacity: 0,
    haloScale: 0,
    opacity: 1,
    scale: 1
  }
});

describe("car labels", () => {
  it("adds a leader label and a selected label when they differ", () => {
    const labels = buildCarLabels([
      createCar({ driverId: "NOR", rank: 1 }),
      createCar({ driverId: "VER", rank: 2, selected: true })
    ]);

    expect(labels).toEqual([
      { driverId: "NOR", text: "Leader · NOR", tone: "leader" },
      { driverId: "VER", text: "Focus · VER", tone: "selected" }
    ]);
  });

  it("avoids duplicate labels when the leader is also selected", () => {
    const labels = buildCarLabels([
      createCar({ driverId: "NOR", rank: 1, selected: true })
    ]);

    expect(labels).toEqual([
      { driverId: "NOR", text: "Leader · NOR", tone: "leader" }
    ]);
  });
});
