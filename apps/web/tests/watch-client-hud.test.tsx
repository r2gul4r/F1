import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

vi.mock("@/src/components/driver-panel", () => ({
  DriverPanel: () => <div data-testid="driver-panel" />
}));

vi.mock("@/src/components/prediction-card", () => ({
  PredictionCard: () => <div data-testid="prediction-card" />
}));

describe("watch client HUD isolation", () => {
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
      ticksByDriver: {
        VER: {
          sessionId: "session-1",
          driverId: "VER",
          position: { x: 1, y: 2, z: 0 },
          speedKph: 320,
          lap: 7,
          rank: 1,
          timestampMs: 1000
        }
      },
      selectedDriverId: "VER",
      flag: null,
      predictions: [],
      fps: 60
    });
  });

  afterEach(() => {
    cleanup();
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("HUD가 실패해도 메인 canvas와 패널은 유지됨", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.doMock("@/src/components/selected-driver-hud", () => ({
      SelectedDriverHud: () => {
        throw new Error("hud failure");
      }
    }));

    const { WatchClient } = await import("../src/components/watch-client");
    render(<WatchClient sessionId="session-1" watchToken="watch-token" />);

    expect(screen.getByTestId("race-canvas")).toBeTruthy();
    expect(screen.getByTestId("driver-panel")).toBeTruthy();
    expect(screen.getByText("HUD 일시 중단")).toBeTruthy();
    expect(screen.getByText("선택 드라이버")).toBeTruthy();
    expect(screen.getByText("#1 VER")).toBeTruthy();
    expect(screen.getByText("드라이버 수")).toBeTruthy();
  });

  it("HUD를 꺼도 메인 canvas는 그대로 유지됨", async () => {
    vi.doMock("@/src/components/selected-driver-hud", () => ({
      SelectedDriverHud: () => <div>#1 Max Verstappen</div>
    }));

    const { WatchClient } = await import("../src/components/watch-client");
    render(<WatchClient sessionId="session-1" watchToken="watch-token" />);

    expect(screen.getByText("HUD 끄기")).toBeTruthy();
    fireEvent.click(screen.getByTestId("hud-toggle"));

    expect(screen.getByText("HUD 켜기")).toBeTruthy();
    expect(screen.queryByText("#1 Max Verstappen")).toBeNull();
    expect(screen.getByTestId("race-canvas")).toBeTruthy();
  });

  it("focus mode를 켜면 sidebar 없이 canvas에 집중함", async () => {
    vi.doMock("@/src/components/selected-driver-hud", () => ({
      SelectedDriverHud: () => <div>#1 Max Verstappen</div>
    }));

    const { WatchClient } = await import("../src/components/watch-client");
    render(<WatchClient sessionId="session-1" watchToken="watch-token" />);

    expect(screen.getByText("집중 모드 켜기")).toBeTruthy();
    fireEvent.click(screen.getByTestId("focus-toggle"));

    expect(screen.getByText("집중 모드 끄기")).toBeTruthy();
    expect(screen.queryByText("드라이버")).toBeNull();
    expect(screen.getByTestId("race-canvas")).toBeTruthy();
  });
});
