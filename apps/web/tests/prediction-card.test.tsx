import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PredictionCard } from "../src/components/prediction-card";
import { useRaceStore } from "../src/store/use-race-store";

describe("prediction card", () => {
  beforeEach(() => {
    useRaceStore.setState({
      drivers: [],
      ticksByDriver: {},
      selectedDriverId: "NOR",
      flag: null,
      predictions: [],
      fps: 0
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("예측이 없으면 대기 상태를 보여줌", () => {
    render(<PredictionCard />);

    expect(screen.getByText("예측 대기 중")).toBeTruthy();
  });

  it("최신 예측의 확률과 latency를 읽기 쉬운 형태로 보여줌", () => {
    useRaceStore.getState().addPrediction({
      sessionId: "session-1",
      lap: 12,
      triggerDriverId: "NOR",
      podiumProb: [0.61, 0.27, 0.12],
      reasoningSummary: "Norris pace advantage",
      modelLatencyMs: 812,
      timestampMs: new Date("2026-03-12T10:00:00.000Z").getTime()
    });

    render(<PredictionCard />);

    expect(screen.getByText("P1 확률")).toBeTruthy();
    expect(screen.getByText("P2 확률")).toBeTruthy();
    expect(screen.getByText("P3 확률")).toBeTruthy();
    expect(screen.getByText("61%")).toBeTruthy();
    expect(screen.getByText("27%")).toBeTruthy();
    expect(screen.getByText("12%")).toBeTruthy();
    expect(screen.getByText("812 ms")).toBeTruthy();
    expect(screen.getByText("선택 드라이버 관련 예측")).toBeTruthy();
    expect(screen.getByText("Norris pace advantage")).toBeTruthy();
    expect(screen.queryByText(/최신 전체 예측보다 이전 시각 데이터/)).toBeNull();
  });

  it("선택 드라이버와 다른 trigger면 다른 드라이버 예측으로 표시함", () => {
    useRaceStore.getState().setSelectedDriverId("VER");
    useRaceStore.getState().addPrediction({
      sessionId: "session-1",
      lap: 12,
      triggerDriverId: "NOR",
      podiumProb: [0.61, 0.27, 0.12],
      reasoningSummary: "Norris pace advantage",
      modelLatencyMs: 812,
      timestampMs: new Date("2026-03-12T10:00:00.000Z").getTime()
    });

    render(<PredictionCard />);

    expect(screen.getByText("다른 드라이버 예측")).toBeTruthy();
    expect(screen.queryByText(/최신 전체 예측보다 이전 시각 데이터/)).toBeNull();
  });

  it("선택 드라이버의 예측이 있으면 최신 전체 예측보다 먼저 보여줌", () => {
    useRaceStore.getState().setSelectedDriverId("NOR");
    useRaceStore.getState().addPrediction({
      sessionId: "session-1",
      lap: 11,
      triggerDriverId: "NOR",
      podiumProb: [0.58, 0.28, 0.14],
      reasoningSummary: "Norris selected-driver view",
      modelLatencyMs: 790,
      timestampMs: new Date("2026-03-12T09:59:45.000Z").getTime()
    });
    useRaceStore.getState().addPrediction({
      sessionId: "session-1",
      lap: 12,
      triggerDriverId: "VER",
      podiumProb: [0.52, 0.31, 0.17],
      reasoningSummary: "Verstappen latest overall",
      modelLatencyMs: 760,
      timestampMs: new Date("2026-03-12T10:00:00.000Z").getTime()
    });

    render(<PredictionCard />);

    expect(screen.getByText("선택 드라이버 관련 예측")).toBeTruthy();
    expect(screen.getByText("Norris selected-driver view")).toBeTruthy();
    expect(screen.getByText(/최신 전체 예측보다 15초 이전 데이터/)).toBeTruthy();
    expect(screen.queryByText("Verstappen latest overall")).toBeNull();
  });

  it("선택 드라이버 예측이 최신이면 stale 경고를 보여주지 않음", () => {
    useRaceStore.getState().setSelectedDriverId("NOR");
    useRaceStore.getState().addPrediction({
      sessionId: "session-1",
      lap: 11,
      triggerDriverId: "VER",
      podiumProb: [0.58, 0.28, 0.14],
      reasoningSummary: "Verstappen older prediction",
      modelLatencyMs: 790,
      timestampMs: new Date("2026-03-12T09:59:45.000Z").getTime()
    });
    useRaceStore.getState().addPrediction({
      sessionId: "session-1",
      lap: 12,
      triggerDriverId: "NOR",
      podiumProb: [0.52, 0.31, 0.17],
      reasoningSummary: "Norris latest overall",
      modelLatencyMs: 760,
      timestampMs: new Date("2026-03-12T10:00:00.000Z").getTime()
    });

    render(<PredictionCard />);

    expect(screen.getByText("선택 드라이버 관련 예측")).toBeTruthy();
    expect(screen.getByText("Norris latest overall")).toBeTruthy();
    expect(screen.queryByText(/최신 전체 예측보다 .*초 이전 데이터/)).toBeNull();
  });

  it("선택 드라이버가 없으면 중립 문구로 표시함", () => {
    useRaceStore.setState({
      selectedDriverId: null
    });
    useRaceStore.getState().addPrediction({
      sessionId: "session-1",
      lap: 12,
      triggerDriverId: "NOR",
      podiumProb: [0.61, 0.27, 0.12],
      reasoningSummary: "Norris pace advantage",
      modelLatencyMs: 812,
      timestampMs: new Date("2026-03-12T10:00:00.000Z").getTime()
    });

    render(<PredictionCard />);

    expect(screen.getByText("선택 드라이버 미정")).toBeTruthy();
  });
});
