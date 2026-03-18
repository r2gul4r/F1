import type { AiPrediction, Driver } from "@f1/core";

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

const normalizeProbabilities = (values: [number, number, number]): [number, number, number] => {
  const total = values[0] + values[1] + values[2];
  if (total <= 0) {
    return [1 / 3, 1 / 3, 1 / 3];
  }

  return [values[0] / total, values[1] / total, values[2] / total];
};

export const buildMockPredictions = (input: {
  sessionId: string;
  lap: number;
  drivers: Driver[];
  timestampMs: number;
}): AiPrediction[] => {
  if (input.drivers.length === 0) {
    return [];
  }

  const recentLaps = [Math.max(1, input.lap - 1), input.lap];
  return recentLaps.map((lap, index) => {
    const triggerDriver = input.drivers[(lap + index) % input.drivers.length] ?? input.drivers[0];
    const p1 = clamp(0.42 + ((lap + index) % 4) * 0.06);
    const p2 = clamp(0.33 - (lap % 3) * 0.03);
    const p3 = clamp(1 - p1 - p2);
    const podiumProb = normalizeProbabilities([p1, p2, p3]);

    return {
      sessionId: input.sessionId,
      lap,
      triggerDriverId: triggerDriver?.id ?? "UNKNOWN",
      podiumProb,
      isFallback: false,
      reasoningSummary: `Lap ${lap} mock prediction anchored to local deterministic context`,
      modelLatencyMs: 120 + index * 35,
      timestampMs: input.timestampMs - (recentLaps.length - index - 1) * 14_000
    };
  });
};

export const updateMockPredictionHistory = (input: {
  sessionId: string;
  lap: number;
  drivers: Driver[];
  timestampMs: number;
  previousPredictions: AiPrediction[];
}): AiPrediction[] => {
  const latestLap = input.previousPredictions[input.previousPredictions.length - 1]?.lap ?? null;

  if (latestLap === input.lap) {
    return input.previousPredictions.map((prediction) => ({ ...prediction }));
  }

  const nextPrediction = buildMockPredictions({
    sessionId: input.sessionId,
    lap: input.lap,
    drivers: input.drivers,
    timestampMs: input.timestampMs
  }).slice(-1);

  if (nextPrediction.length === 0) {
    return [];
  }

  return [...input.previousPredictions, ...nextPrediction].slice(-2).map((prediction) => ({ ...prediction }));
};
