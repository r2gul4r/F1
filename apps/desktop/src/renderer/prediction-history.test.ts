import { describe, expect, it } from "vitest";
import type { AiPrediction } from "@f1/core";
import { buildPredictionHistory } from "./prediction-history";

const predictions: AiPrediction[] = [
  {
    sessionId: "s1",
    lap: 25,
    triggerDriverId: "VER",
    podiumProb: [0.55, 0.28, 0.17],
    isFallback: false,
    fallbackReason: undefined,
    reasoningSummary: "older",
    modelLatencyMs: 150,
    timestampMs: 1
  },
  {
    sessionId: "s1",
    lap: 26,
    triggerDriverId: "NOR",
    podiumProb: [0.61, 0.24, 0.15],
    isFallback: true,
    fallbackReason: "timeout",
    reasoningSummary: "newer",
    modelLatencyMs: 180,
    timestampMs: 2
  }
];

describe("prediction history", () => {
  it("returns recent predictions in newest-first order", () => {
    expect(buildPredictionHistory(predictions)).toEqual([
      { lap: 26, triggerDriverId: "NOR", isFallback: true, fallbackReason: "timeout" },
      { lap: 25, triggerDriverId: "VER", isFallback: false, fallbackReason: undefined }
    ]);
  });
});
