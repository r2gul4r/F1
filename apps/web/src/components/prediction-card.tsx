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

const formatRelativeElapsed = (timestampMs: number, nowMs: number): string => {
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - timestampMs) / 1000));

  if (elapsedSeconds === 0) {
    return "방금 전";
  }

  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}초 전`;
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}분 전`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  return `${elapsedHours}시간 전`;
};

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
  const staleGapSeconds =
    isSelectedPredictionStale && latest !== undefined && selectedDriverPrediction !== null
      ? Math.ceil((latest.timestampMs - selectedDriverPrediction.timestampMs) / 1000)
      : null;
  const [nowMs, setNowMs] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (!visiblePrediction) {
      return;
    }

    setNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [visiblePrediction]);

  if (!visiblePrediction) {
    return <div className="prediction-empty muted">예측 대기 중</div>;
  }

  const selectedDriverContext =
    selectedDriverId === null
      ? "선택 드라이버 미정"
      : visiblePrediction.triggerDriverId === selectedDriverId
        ? "선택 드라이버 관련 예측"
        : "다른 드라이버 예측";
  const predictionTimestamp = formatPredictionTime(visiblePrediction.timestampMs);
  const relativeElapsed = formatRelativeElapsed(visiblePrediction.timestampMs, nowMs);

  return (
    <article className="prediction">
      <h3>P5 트리거 예측</h3>
      <p className="muted">Lap {visiblePrediction.lap} · Driver {visiblePrediction.triggerDriverId}</p>
      <p className="muted">{selectedDriverContext}</p>
      {isSelectedPredictionStale ? (
        <p className="prediction-stale-alert">
          선택 드라이버 예측 우선 표시 중 · 최신 전체 예측보다 {staleGapSeconds}초 이전 데이터
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
      <p className="muted">
        생성 시각 {predictionTimestamp} · {relativeElapsed}
      </p>
      <p>{visiblePrediction.reasoningSummary}</p>
    </article>
  );
};
