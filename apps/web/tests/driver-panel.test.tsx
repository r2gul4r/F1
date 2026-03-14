import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("선택된 드라이버의 텔레메트리가 없으면 대기 상태를 보여줌", () => {
    render(<DriverPanel />);

    expect(screen.getByText("Max Verstappen")).toBeTruthy();
    expect(screen.getByText("텔레메트리 대기 중")).toBeTruthy();
    const statusChip = screen.getByTestId("driver-panel-telemetry-status");
    expect(statusChip.textContent).toBe("미수신");
    expect(statusChip.className).toContain("telemetry-status-chip-no-telemetry");
  });

  it("선택된 드라이버의 핵심 텔레메트리를 카드로 보여줌", () => {
    const now = Date.now();
    useRaceStore.getState().upsertTick({
      sessionId: "session-1",
      driverId: "VER",
      position: { x: 1, y: 2, z: 0 },
      speedKph: 320.4,
      lap: 7,
      rank: 1,
      timestampMs: now
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
    expect(screen.queryByText("지연 텔레메트리")).toBeNull();
    const statusChip = screen.getByTestId("driver-panel-telemetry-status");
    expect(statusChip.textContent).toBe("정상");
    expect(statusChip.className).toContain("telemetry-status-chip-fresh");
  });

  it("오래된 텔레메트리는 stale 상태를 명확히 보여줌", () => {
    const now = Date.now();
    useRaceStore.getState().upsertTick({
      sessionId: "session-1",
      driverId: "VER",
      position: { x: 1, y: 2, z: 0 },
      speedKph: 301.2,
      lap: 18,
      rank: 4,
      timestampMs: now - 16000
    });

    render(<DriverPanel />);

    expect(screen.getByText("지연 텔레메트리")).toBeTruthy();
    expect(screen.getByText("301.2 kph")).toBeTruthy();
    expect(screen.getByText("18")).toBeTruthy();
    const statusChip = screen.getByTestId("driver-panel-telemetry-status");
    expect(statusChip.textContent).toBe("지연");
    expect(statusChip.className).toContain("telemetry-status-chip-stale");
  });

  it("fresh 텔레메트리는 추가 수신이 없어도 15초 뒤 stale 경고로 전환됨", async () => {
    vi.useFakeTimers();
    const now = new Date("2026-03-13T00:00:00.000Z").getTime();
    vi.setSystemTime(now);

    useRaceStore.getState().upsertTick({
      sessionId: "session-1",
      driverId: "VER",
      position: { x: 1, y: 2, z: 0 },
      speedKph: 319.8,
      lap: 12,
      rank: 3,
      timestampMs: now
    });

    render(<DriverPanel />);

    expect(screen.queryByText("지연 텔레메트리")).toBeNull();
    expect(screen.getByTestId("driver-panel-telemetry-status").textContent).toBe("정상");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15001);
    });

    expect(screen.getByText("지연 텔레메트리")).toBeTruthy();
    expect(screen.getByText("319.8 kph")).toBeTruthy();
    expect(screen.getByTestId("driver-panel-telemetry-status").textContent).toBe("지연");
  });

  it("선택 드라이버 없음/있음 상태 전환에서도 hook 순서 오류가 나지 않음", () => {
    useRaceStore.setState((state) => ({
      ...state,
      selectedDriverId: null
    }));

    render(<DriverPanel />);
    expect(screen.getByText("드라이버 선택 필요")).toBeTruthy();

    act(() => {
      useRaceStore.getState().setSelectedDriverId("VER");
    });
    expect(screen.getByText("Max Verstappen")).toBeTruthy();

    act(() => {
      useRaceStore.getState().setSelectedDriverId(null);
    });
    expect(screen.getByText("드라이버 선택 필요")).toBeTruthy();
  });

  it("driver list는 fresh telemetry에서 기존 rank/speed 표시를 유지함", async () => {
    const now = Date.now();
    useRaceStore.getState().upsertTick({
      sessionId: "session-1",
      driverId: "VER",
      position: { x: 1, y: 2, z: 0 },
      speedKph: 320,
      lap: 7,
      rank: 2,
      timestampMs: now
    });
    useRaceStore.getState().upsertTick({
      sessionId: "session-1",
      driverId: "NOR",
      position: { x: 3, y: 4, z: 0 },
      speedKph: 325,
      lap: 7,
      rank: 1,
      timestampMs: now + 1
    });

    const { WatchClient } = await import("../src/components/watch-client");
    render(<WatchClient sessionId="session-1" watchToken="watch-token" />);

    expect(screen.getAllByText("#1 Max Verstappen").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Red Bull").length).toBeGreaterThan(0);

    const rows = screen
      .getAllByRole("button")
      .map((button) => button.textContent?.replace(/\s+/g, " ").trim() ?? "")
      .filter((text) => text.startsWith("#"));

    expect(rows).toEqual([
      "#4 Lando NorrisMcLarenR1325 kph",
      "#1 Max Verstappen선택됨Red BullR2320 kph"
    ]);
    expect(screen.queryByText("지연 텔레메트리")).toBeNull();
  });

  it("driver list는 stale telemetry에서 지연 상태를 row에 표시함", async () => {
    vi.useFakeTimers();
    const now = new Date("2026-03-13T00:00:00.000Z").getTime();
    vi.setSystemTime(now);

    useRaceStore.getState().upsertTick({
      sessionId: "session-1",
      driverId: "VER",
      position: { x: 1, y: 2, z: 0 },
      speedKph: 320,
      lap: 7,
      rank: 2,
      timestampMs: now - 17000
    });
    useRaceStore.getState().upsertTick({
      sessionId: "session-1",
      driverId: "NOR",
      position: { x: 3, y: 4, z: 0 },
      speedKph: 325,
      lap: 7,
      rank: 1,
      timestampMs: now - 16000
    });

    const { WatchClient } = await import("../src/components/watch-client");
    render(<WatchClient sessionId="session-1" watchToken="watch-token" />);

    const rows = screen
      .getAllByRole("button")
      .map((button) => button.textContent?.replace(/\s+/g, " ").trim() ?? "")
      .filter((text) => text.startsWith("#"));

    expect(rows).toEqual([
      "#4 Lando NorrisMcLaren지연 텔레메트리지연 R1지연 325 kph",
      "#1 Max Verstappen선택됨Red Bull지연 텔레메트리지연 R2지연 320 kph"
    ]);
  });

  it("driver list는 mixed fresh/stale/no telemetry에서 fresh > stale > no telemetry 순서로 보여줌", async () => {
    vi.useFakeTimers();
    const now = new Date("2026-03-13T00:00:00.000Z").getTime();
    vi.setSystemTime(now);

    useRaceStore.setState((state) => ({
      ...state,
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
        },
        {
          id: "HAM",
          sessionId: "session-1",
          fullName: "Lewis Hamilton",
          number: 44,
          teamName: "Ferrari",
          deepLink: "https://f1tv.formula1.com"
        },
        {
          id: "PIA",
          sessionId: "session-1",
          fullName: "Oscar Piastri",
          number: 81,
          teamName: "McLaren",
          deepLink: "https://f1tv.formula1.com"
        }
      ],
      selectedDriverId: "VER"
    }));

    useRaceStore.getState().upsertTick({
      sessionId: "session-1",
      driverId: "VER",
      position: { x: 1, y: 2, z: 0 },
      speedKph: 320,
      lap: 7,
      rank: 2,
      timestampMs: now
    });
    useRaceStore.getState().upsertTick({
      sessionId: "session-1",
      driverId: "HAM",
      position: { x: 3, y: 4, z: 0 },
      speedKph: 318,
      lap: 7,
      rank: 3,
      timestampMs: now
    });
    useRaceStore.getState().upsertTick({
      sessionId: "session-1",
      driverId: "NOR",
      position: { x: 5, y: 6, z: 0 },
      speedKph: 325,
      lap: 7,
      rank: 1,
      timestampMs: now - 17000
    });

    const { WatchClient } = await import("../src/components/watch-client");
    render(<WatchClient sessionId="session-1" watchToken="watch-token" />);

    const rows = screen
      .getAllByRole("button")
      .map((button) => button.textContent?.replace(/\s+/g, " ").trim() ?? "")
      .filter((text) => text.startsWith("#"));

    expect(rows).toEqual([
      "#1 Max Verstappen선택됨Red BullR2320 kph",
      "#44 Lewis HamiltonFerrariR3318 kph",
      "#4 Lando NorrisMcLaren지연 텔레메트리지연 R1지연 325 kph",
      "#81 Oscar PiastriMcLaren텔레메트리 미수신순위 미수신속도 미수신"
    ]);
  });

  it("딥링크 실패 경고는 선택 드라이버 전환 시 초기화됨", () => {
    vi.stubGlobal("open", vi.fn().mockReturnValue(null));
    useRaceStore.setState((state) => ({
      ...state,
      drivers: state.drivers.map((driver) => ({
        ...driver,
        deepLink: driver.id === "VER" ? "https://f1tv.formula1.com/ver" : "https://f1tv.formula1.com/nor"
      })),
      selectedDriverId: "VER"
    }));

    render(<DriverPanel />);

    fireEvent.click(screen.getByRole("button", { name: "공식 온보드 열기" }));
    expect(screen.getByText("딥링크 실행 실패")).toBeTruthy();
    const fallbackBeforeSwitch = screen.getByRole("link", { name: "직접 열기" }) as HTMLAnchorElement;
    expect(fallbackBeforeSwitch.getAttribute("href")).toBe("https://f1tv.formula1.com/ver");

    act(() => {
      useRaceStore.getState().setSelectedDriverId("NOR");
    });

    expect(screen.queryByText("딥링크 실행 실패")).toBeNull();
    expect(screen.queryByRole("link", { name: "직접 열기" })).toBeNull();
  });

  it("직접 열기 fallback은 실패한 현재 드라이버 링크만 보여줌", () => {
    const openMock = vi.fn().mockReturnValue(null);
    vi.stubGlobal("open", openMock);
    useRaceStore.setState((state) => ({
      ...state,
      drivers: state.drivers.map((driver) => ({
        ...driver,
        deepLink: driver.id === "VER" ? "https://f1tv.formula1.com/ver" : "https://f1tv.formula1.com/nor"
      })),
      selectedDriverId: "VER"
    }));

    render(<DriverPanel />);

    fireEvent.click(screen.getByRole("button", { name: "공식 온보드 열기" }));
    let fallbackLink = screen.getByRole("link", { name: "직접 열기" }) as HTMLAnchorElement;
    expect(fallbackLink.getAttribute("href")).toBe("https://f1tv.formula1.com/ver");

    act(() => {
      useRaceStore.getState().setSelectedDriverId("NOR");
    });
    expect(screen.queryByRole("link", { name: "직접 열기" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "공식 온보드 열기" }));
    fallbackLink = screen.getByRole("link", { name: "직접 열기" }) as HTMLAnchorElement;
    expect(fallbackLink.getAttribute("href")).toBe("https://f1tv.formula1.com/nor");
    expect(openMock).toHaveBeenCalledTimes(2);
  });

  it("딥링크 실패 경고는 같은 driver id의 세션 전환에서도 초기화됨", () => {
    vi.stubGlobal("open", vi.fn().mockReturnValue(null));
    useRaceStore.setState((state) => ({
      ...state,
      drivers: [
        {
          id: "VER",
          sessionId: "session-1",
          fullName: "Max Verstappen",
          number: 1,
          teamName: "Red Bull",
          deepLink: "https://f1tv.formula1.com/session-1/ver"
        }
      ],
      selectedDriverId: "VER"
    }));

    render(<DriverPanel />);

    fireEvent.click(screen.getByRole("button", { name: "공식 온보드 열기" }));
    expect(screen.getByText("딥링크 실행 실패")).toBeTruthy();

    act(() => {
      useRaceStore.setState((state) => ({
        ...state,
        drivers: [
          {
            id: "VER",
            sessionId: "session-2",
            fullName: "Max Verstappen",
            number: 1,
            teamName: "Red Bull",
            deepLink: "https://f1tv.formula1.com/session-2/ver"
          }
        ],
        selectedDriverId: "VER"
      }));
    });

    expect(screen.queryByText("딥링크 실행 실패")).toBeNull();
    expect(screen.queryByRole("link", { name: "직접 열기" })).toBeNull();
  });
});
