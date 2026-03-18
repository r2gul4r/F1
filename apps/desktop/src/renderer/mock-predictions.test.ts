import { describe, expect, it } from "vitest";
import type { Driver } from "@f1/core";
import { buildMockPredictions, updateMockPredictionHistory } from "./mock-predictions.js";

const drivers: Driver[] = [
  { id: "VER", sessionId: "session-1", fullName: "Max Verstappen", number: 1, teamName: "Red Bull", deepLink: "https://example.com/ver" },
  { id: "NOR", sessionId: "session-1", fullName: "Lando Norris", number: 4, teamName: "McLaren", deepLink: "https://example.com/nor" },
  { id: "LEC", sessionId: "session-1", fullName: "Charles Leclerc", number: 16, teamName: "Ferrari", deepLink: "https://example.com/lec" }
];

describe("mock predictions", () => {
  it("creates lap-based deterministic predictions with normalized probabilities", () => {
    const predictions = buildMockPredictions({
      sessionId: "session-1",
      lap: 8,
      drivers,
      timestampMs: 40_000
    });

    expect(predictions).toHaveLength(2);
    expect(predictions[0]?.lap).toBe(7);
    expect(predictions[1]?.lap).toBe(8);
    expect(predictions[1]?.podiumProb.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 6);
  });

  it("returns no predictions when no drivers exist", () => {
    expect(
      buildMockPredictions({
        sessionId: "session-1",
        lap: 4,
        drivers: [],
        timestampMs: 10_000
      })
    ).toEqual([]);
  });

  it("keeps prediction history stable within the same lap", () => {
    const previousPredictions = updateMockPredictionHistory({
      sessionId: "session-1",
      lap: 8,
      drivers,
      timestampMs: 40_000,
      previousPredictions: []
    });

    const sameLapPredictions = updateMockPredictionHistory({
      sessionId: "session-1",
      lap: 8,
      drivers,
      timestampMs: 55_000,
      previousPredictions
    });

    expect(sameLapPredictions).toEqual(previousPredictions);
  });

  it("appends a new prediction only when the lap increments", () => {
    const lapEight = updateMockPredictionHistory({
      sessionId: "session-1",
      lap: 8,
      drivers,
      timestampMs: 40_000,
      previousPredictions: []
    });

    const lapNine = updateMockPredictionHistory({
      sessionId: "session-1",
      lap: 9,
      drivers,
      timestampMs: 60_000,
      previousPredictions: lapEight
    });

    expect(lapNine.map((prediction) => prediction.lap)).toEqual([8, 9]);
    expect(lapNine[1]?.timestampMs).toBe(60_000);
  });
});
