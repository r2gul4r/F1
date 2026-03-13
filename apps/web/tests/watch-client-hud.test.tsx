import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRaceStore } from "../src/store/use-race-store";

const { raceCanvasSpy } = vi.hoisted(() => ({
  raceCanvasSpy: vi.fn()
}));

vi.mock("@/src/lib/use-race-socket", () => ({
  useRaceSocket: () => ({
    status: "connected",
    reconnectInMs: 0
  })
}));

vi.mock("@/src/components/race-canvas", () => ({
  RaceCanvas: (props: { focusModeEnabled: boolean }) => {
    raceCanvasSpy(props);

    return <div data-testid="race-canvas" />;
  }
}));

vi.mock("@/src/components/driver-panel", () => ({
  DriverPanel: () => <div data-testid="driver-panel" />
}));

vi.mock("@/src/components/prediction-card", () => ({
  PredictionCard: () => <div data-testid="prediction-card" />
}));

describe("watch client HUD isolation", () => {
  beforeEach(() => {
    raceCanvasSpy.mockClear();
    useRaceStore.setState({
      drivers: [
        {
          id: "VER",
          sessionId: "session-1",
          fullName: "Max Verstappen",
          number: 1,
          teamName: "Red Bull",
          deepLink: "https://f1tv.formula1.com"
        },
        {
          id: "NOR",
          sessionId: "session-1",
          fullName: "Lando Norris",
          number: 4,
          teamName: "McLaren",
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
          rank: 2,
          timestampMs: 1000
        },
        NOR: {
          sessionId: "session-1",
          driverId: "NOR",
          position: { x: 3, y: 4, z: 0 },
          speedKph: 325,
          lap: 7,
          rank: 1,
          timestampMs: 1001
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
    vi.useRealTimers();
    vi.restoreAllMocks();
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
    await waitFor(() => {
      expect(raceCanvasSpy).toHaveBeenLastCalledWith(expect.objectContaining({ focusModeEnabled: true }));
    });
  });

  it("선택 드라이버가 목록에서 사라지면 첫 유효 드라이버로 HUD 대상을 되돌림", async () => {
    const { WatchClient } = await import("../src/components/watch-client");
    const { useRaceStore: runtimeStore } = await import("../src/store/use-race-store");

    runtimeStore.setState({
      drivers: [
        {
          id: "VER",
          sessionId: "session-1",
          fullName: "Max Verstappen",
          number: 1,
          teamName: "Red Bull",
          deepLink: "https://f1tv.formula1.com"
        },
        {
          id: "NOR",
          sessionId: "session-1",
          fullName: "Lando Norris",
          number: 4,
          teamName: "McLaren",
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
          rank: 2,
          timestampMs: 1000
        },
        NOR: {
          sessionId: "session-1",
          driverId: "NOR",
          position: { x: 3, y: 4, z: 0 },
          speedKph: 325,
          lap: 7,
          rank: 1,
          timestampMs: 1001
        }
      },
      selectedDriverId: "VER",
      flag: null,
      predictions: [],
      fps: 60
    });

    render(<WatchClient sessionId="session-1" watchToken="watch-token" />);

    expect(screen.getByText("#1 VER")).toBeTruthy();

    act(() => {
      runtimeStore.setState((state) => ({
        ...state,
        drivers: state.drivers.filter((driver) => driver.id !== "VER")
      }));
    });

    expect(screen.getByText("#4 NOR")).toBeTruthy();
    expect(screen.getByText("#4 Lando Norris")).toBeTruthy();
  });

  it("선택 드라이버 KPI에서 telemetry freshness를 즉시 표시함", async () => {
    vi.useFakeTimers();
    const fixedNow = new Date("2026-03-13T10:00:20.000Z");
    vi.setSystemTime(fixedNow);

    vi.doMock("@/src/components/selected-driver-hud", () => ({
      SelectedDriverHud: () => <div>#1 Max Verstappen</div>
    }));

    const { WatchClient } = await import("../src/components/watch-client");
    const { useRaceStore: runtimeStore } = await import("../src/store/use-race-store");
    const nowMs = fixedNow.getTime();

    runtimeStore.setState({
      drivers: [
        {
          id: "VER",
          sessionId: "session-1",
          fullName: "Max Verstappen",
          number: 1,
          teamName: "Red Bull",
          deepLink: "https://f1tv.formula1.com"
        },
        {
          id: "NOR",
          sessionId: "session-1",
          fullName: "Lando Norris",
          number: 4,
          teamName: "McLaren",
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
          rank: 2,
          timestampMs: nowMs - 1000
        },
        NOR: {
          sessionId: "session-1",
          driverId: "NOR",
          position: { x: 3, y: 4, z: 0 },
          speedKph: 325,
          lap: 7,
          rank: 1,
          timestampMs: nowMs - 900
        }
      },
      selectedDriverId: "VER",
      flag: null,
      predictions: [],
      fps: 60
    });

    render(<WatchClient sessionId="session-1" watchToken="watch-token" />);

    expect(screen.getByText("#1 VER")).toBeTruthy();
    expect(screen.getByTestId("selected-driver-telemetry-status").textContent).toBe("fresh");

    act(() => {
      runtimeStore.setState((state) => ({
        ...state,
        ticksByDriver: {
          ...state.ticksByDriver,
          VER: {
            ...state.ticksByDriver.VER,
            timestampMs: nowMs - 16000
          }
        }
      }));
    });

    expect(screen.getByTestId("selected-driver-telemetry-status").textContent).toBe("stale");

    act(() => {
      runtimeStore.setState((state) => {
        const nextTicksByDriver = { ...state.ticksByDriver };
        delete nextTicksByDriver.VER;

        return {
          ...state,
          ticksByDriver: nextTicksByDriver
        };
      });
    });

    expect(screen.getByTestId("selected-driver-telemetry-status").textContent).toBe("no telemetry");
  });

});
