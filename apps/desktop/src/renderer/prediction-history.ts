import type { AiPrediction } from "@f1/core";

export type PredictionHistoryItem = {
  lap: number;
  triggerDriverId: string;
  isFallback: boolean;
  fallbackReason?: string;
};

export const buildPredictionHistory = (
  predictions: AiPrediction[],
  limit = 2
): PredictionHistoryItem[] =>
  predictions
    .slice(-limit)
    .reverse()
    .map((prediction) => ({
      lap: prediction.lap,
      triggerDriverId: prediction.triggerDriverId,
      isFallback: prediction.isFallback,
      fallbackReason: prediction.fallbackReason
    }));
