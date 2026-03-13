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
  const selectedDriverPrediction =
    selectedDriverId === null
      ? null
      : [...predictions].reverse().find((prediction) => prediction.triggerDriverId === selectedDriverId) ?? null;
  const visiblePrediction = selectedDriverPrediction ?? latest;
  const isSelectedDriverPriorityView = selectedDriverPrediction !== null;
  const isSelectedPredictionStale =
    isSelectedDriverPriorityView &&
    latest !== undefined &&
    selectedDriverPrediction.timestampMs < latest.timestampMs;

  if (!visiblePrediction) {
    return <div className="prediction-empty muted">예측 대기 중</div>;
  }

  const selectedDriverContext =
    selectedDriverId === null
      ? "선택 드라이버 미정"
      : visiblePrediction.triggerDriverId === selectedDriverId
        ? "선택 드라이버 관련 예측"
        : "다른 드라이버 예측";

  return (
    <article className="prediction">
      <h3>P5 트리거 예측</h3>
      <p className="muted">Lap {visiblePrediction.lap} · Driver {visiblePrediction.triggerDriverId}</p>
      <p className="muted">{selectedDriverContext}</p>
      {isSelectedPredictionStale ? (
        <p className="prediction-stale-alert">
          선택 드라이버 예측 우선 표시 중 · 최신 전체 예측보다 이전 시각 데이터
        </p>
      ) : null}
      <div className="prediction-grid">
        <article className="prediction-stat">
          <div className="muted">P1 확률</div>
          <div className="prediction-value">{Math.round(visiblePrediction.podiumProb[0] * 100)}%</div>
        </article>
        <article className="prediction-stat">
          <div className="muted">P2 확률</div>
          <div className="prediction-value">{Math.round(visiblePrediction.podiumProb[1] * 100)}%</div>
        </article>
        <article className="prediction-stat">
          <div className="muted">P3 확률</div>
          <div className="prediction-value">{Math.round(visiblePrediction.podiumProb[2] * 100)}%</div>
        </article>
        <article className="prediction-stat">
          <div className="muted">모델 지연</div>
          <div className="prediction-value">{visiblePrediction.modelLatencyMs} ms</div>
        </article>
      </div>
      <p className="muted">생성 시각 {formatPredictionTime(visiblePrediction.timestampMs)}</p>
      <p>{visiblePrediction.reasoningSummary}</p>
    </article>
  );
};
