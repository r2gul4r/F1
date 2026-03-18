import { AiPrediction, PredictionContext, PredictionViewModel } from "./contracts.js";

const toLatestPrediction = (predictions: AiPrediction[]): AiPrediction | null =>
  predictions.length > 0 ? predictions[predictions.length - 1] : null;

const toSelectedDriverPrediction = (
  predictions: AiPrediction[],
  selectedDriverId: string | null
): AiPrediction | null => {
  if (selectedDriverId === null) {
    return null;
  }

  for (let index = predictions.length - 1; index >= 0; index -= 1) {
    const prediction = predictions[index];
    if (prediction && prediction.triggerDriverId === selectedDriverId) {
      return prediction;
    }
  }

  return null;
};

export const resolvePredictionContext = (
  predictions: AiPrediction[],
  selectedDriverId: string | null
): PredictionContext => {
  const latestPrediction = toLatestPrediction(predictions);
  const selectedDriverPrediction = toSelectedDriverPrediction(predictions, selectedDriverId);
  const visiblePrediction = selectedDriverPrediction ?? latestPrediction;
  const selectedDriverPriority = selectedDriverPrediction !== null;
  const selectedPredictionStale =
    selectedDriverPriority &&
    latestPrediction !== null &&
    selectedDriverPrediction.timestampMs < latestPrediction.timestampMs;

  const staleGapSeconds =
    selectedPredictionStale && latestPrediction && selectedDriverPrediction
      ? Math.ceil((latestPrediction.timestampMs - selectedDriverPrediction.timestampMs) / 1000)
      : null;

  return {
    latestPrediction,
    selectedDriverPrediction,
    visiblePrediction,
    selectedDriverPriority,
    selectedPredictionStale,
    staleGapSeconds
  };
};

export const toPredictionViewModel = (
  context: PredictionContext,
  nowMs: number
): PredictionViewModel => {
  const elapsedSeconds = context.visiblePrediction
    ? Math.max(0, Math.floor((nowMs - context.visiblePrediction.timestampMs) / 1000))
    : null;

  return {
    context,
    elapsedSeconds
  };
};
