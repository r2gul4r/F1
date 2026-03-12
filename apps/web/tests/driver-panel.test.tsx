import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DriverPanel } from "../src/components/driver-panel";
import { useRaceStore } from "../src/store/use-race-store";

vi.mock("@/src/lib/use-race-socket", () => ({
  useRaceSocket: () => ({
    status: "connected",
    reconnectInMs: 0
  })
}));

vi.mock("@/src/components/race-canvas", () => ({
  RaceCanvas: () => <div data-testid="race-canvas" />
}));

vi.mock("@/src/components/prediction-card", () => ({
  PredictionCard: () => <div data-testid="prediction-card" />
}));

describe("driver panel", () => {
  beforeEach(() => {
    useRaceStore.setState({
      drivers: [
        {
          id: "VER",
          sessionId: "session-1",
          fullName: "Max Verstappen",
          number: 1,
          teamName: "Red Bull",
          deepLink: "https://f1tv.formula1.com"
        }
      ],
      ticksByDriver: {},
      selectedDriverId: "VER",
      flag: null,
      predictions: [],
      fps: 0
    });
    vi.stubGlobal("open", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("선택된 드라이버의 텔레메트리가 없으면 대기 상태를 보여줌", () => {
    render(<DriverPanel />);

    expect(screen.getByText("Max Verstappen")).toBeTruthy();
    expect(screen.getByText("텔레메트리 대기 중")).toBeTruthy();
  });

  it("선택된 드라이버의 핵심 텔레메트리를 카드로 보여줌", () => {
    useRaceStore.getState().upsertTick({
      sessionId: "session-1",
      driverId: "VER",
      position: { x: 1, y: 2, z: 0 },
      speedKph: 320.4,
      lap: 7,
      rank: 1,
      timestampMs: new Date("2026-03-12T09:50:00.000Z").getTime()
    });

    render(<DriverPanel />);

    expect(screen.getByText("순위")).toBeTruthy();
    expect(screen.getByText("랩")).toBeTruthy();
    expect(screen.getByText("속도")).toBeTruthy();
    expect(screen.getByText("마지막 수신")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
    expect(screen.getByText("320.4 kph")).toBeTruthy();
    expect(screen.getByText(/\d{2}:\d{2}:\d{2}/)).toBeTruthy();
  });

  it("driver list는 번호, 이름, 팀을 함께 보여줌", async () => {
    const { WatchClient } = await import("../src/components/watch-client");
    render(<WatchClient sessionId="session-1" watchToken="watch-token" />);

    expect(screen.getByText("#1 Max Verstappen")).toBeTruthy();
    expect(screen.getAllByText("Red Bull").length).toBeGreaterThan(0);
  });
});
