import { describe, expect, it } from "vitest";
import { AiPrediction, resolvePredictionContext, toPredictionViewModel } from "../src/index.js";

const sessionId = "session-1";

const prediction = (input: {
  triggerDriverId: string;
  lap: number;
  timestampMs: number;
}): AiPrediction => ({
  sessionId,
  lap: input.lap,
  triggerDriverId: input.triggerDriverId,
  podiumProb: [0.5, 0.3, 0.2],
  reasoningSummary: `lap ${input.lap}`,
  modelLatencyMs: 40,
  timestampMs: input.timestampMs
});

describe("prediction context contract", () => {
  it("예측이 없으면 모두 null 문맥을 반환함", () => {
    const context = resolvePredictionContext([], null);
    expect(context).toEqual({
      latestPrediction: null,
      selectedDriverPrediction: null,
      visiblePrediction: null,
      selectedDriverPriority: false,
      selectedPredictionStale: false,
      staleGapSeconds: null
    });
  });

  it("선택 드라이버 예측 우선 노출과 stale gap 계산을 고정함", () => {
    const predictions = [
      prediction({ triggerDriverId: "NOR", lap: 9, timestampMs: 1000 }),
      prediction({ triggerDriverId: "VER", lap: 10, timestampMs: 1500 }),
      prediction({ triggerDriverId: "NOR", lap: 11, timestampMs: 2500 })
    ];

    const context = resolvePredictionContext(predictions, "VER");

    expect(context.latestPrediction?.lap).toBe(11);
    expect(context.selectedDriverPrediction?.lap).toBe(10);
    expect(context.visiblePrediction?.lap).toBe(10);
    expect(context.selectedDriverPriority).toBe(true);
    expect(context.selectedPredictionStale).toBe(true);
    expect(context.staleGapSeconds).toBe(1);
  });

  it("선택 드라이버 예측이 없으면 최신 예측으로 fallback 하고 elapsed seconds를 계산함", () => {
    const predictions = [
      prediction({ triggerDriverId: "NOR", lap: 8, timestampMs: 1000 }),
      prediction({ triggerDriverId: "NOR", lap: 9, timestampMs: 2200 })
    ];

    const context = resolvePredictionContext(predictions, "LEC");
    const viewModel = toPredictionViewModel(context, 5200);

    expect(context.visiblePrediction?.lap).toBe(9);
    expect(context.selectedDriverPriority).toBe(false);
    expect(context.selectedPredictionStale).toBe(false);
    expect(viewModel.elapsedSeconds).toBe(3);
  });
});
