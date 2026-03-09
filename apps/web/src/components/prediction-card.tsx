"use client";

import { useRaceStore } from "@/src/store/use-race-store";

export const PredictionCard = () => {
  const predictions = useRaceStore((state) => state.predictions);
  const latest = predictions[predictions.length - 1];

  if (!latest) {
    return <p className="muted">예측 대기 중</p>;
  }

  return (
    <article className="prediction">
      <h3>P5 트리거 예측</h3>
      <p className="muted">Lap {latest.lap} · Driver {latest.triggerDriverId}</p>
      <p>
        P1 {Math.round(latest.podiumProb[0] * 100)}% / P2 {Math.round(latest.podiumProb[1] * 100)}% / P3 {Math.round(latest.podiumProb[2] * 100)}%
      </p>
      <p>{latest.reasoningSummary}</p>
    </article>
  );
};