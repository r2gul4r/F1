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
