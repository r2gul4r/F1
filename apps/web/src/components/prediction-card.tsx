"use client";

import React from "react";
import { useRaceStore } from "@/src/store/use-race-store";

const formatPredictionTime = (timestampMs: number): string =>
  new Date(timestampMs).toLocaleTimeString("ko-KR", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

export const PredictionCard = () => {
  const predictions = useRaceStore((state) => state.predictions);
  const selectedDriverId = useRaceStore((state) => state.selectedDriverId);
  const latest = predictions[predictions.length - 1];

  if (!latest) {
    return <div className="prediction-empty muted">예측 대기 중</div>;
  }

  const selectedDriverContext =
    selectedDriverId === null
      ? "선택 드라이버 미정"
      : latest.triggerDriverId === selectedDriverId
        ? "선택 드라이버 관련 예측"
        : "다른 드라이버 예측";

  return (
    <article className="prediction">
      <h3>P5 트리거 예측</h3>
      <p className="muted">Lap {latest.lap} · Driver {latest.triggerDriverId}</p>
      <p className="muted">{selectedDriverContext}</p>
      <div className="prediction-grid">
        <article className="prediction-stat">
          <div className="muted">P1 확률</div>
          <div className="prediction-value">{Math.round(latest.podiumProb[0] * 100)}%</div>
        </article>
        <article className="prediction-stat">
          <div className="muted">P2 확률</div>
          <div className="prediction-value">{Math.round(latest.podiumProb[1] * 100)}%</div>
        </article>
        <article className="prediction-stat">
          <div className="muted">P3 확률</div>
          <div className="prediction-value">{Math.round(latest.podiumProb[2] * 100)}%</div>
        </article>
        <article className="prediction-stat">
          <div className="muted">모델 지연</div>
          <div className="prediction-value">{latest.modelLatencyMs} ms</div>
        </article>
      </div>
      <p className="muted">생성 시각 {formatPredictionTime(latest.timestampMs)}</p>
      <p>{latest.reasoningSummary}</p>
    </article>
  );
};
