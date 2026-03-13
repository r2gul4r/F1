import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SelectedDriverHud } from "../src/components/selected-driver-hud";
import { useRaceStore } from "../src/store/use-race-store";

describe("selected driver hud", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-13T09:00:00.000Z"));
    const now = Date.now();

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
          deepLink: "https://www.formula1.com/en/drivers/lando-norris"
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
          timestampMs: now - 1000
        },
        NOR: {
          sessionId: "session-1",
          driverId: "NOR",
          position: { x: 3, y: 4, z: 0 },
          speedKph: 309,
          lap: 7,
          rank: 2,
          timestampMs: now - 900
        }
      },
      selectedDriverId: "VER",
      flag: null,
      predictions: [],
      fps: 0
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("선택 드라이버가 바뀌면 HUD 표시도 같이 바뀜", () => {
    render(<SelectedDriverHud />);

    expect(screen.getByText("#1 Max Verstappen")).toBeTruthy();
    expect(screen.getByText("Red Bull")).toBeTruthy();
    expect(screen.getByText("R1")).toBeTruthy();
    expect(screen.getByText(/업데이트 \d{2}:\d{2}:\d{2}/)).toBeTruthy();
    expect(screen.queryByText("지연 텔레메트리")).toBeNull();
    const onboardLink = screen.getByRole("link", { name: "공식 온보드 열기" });
    expect(onboardLink.getAttribute("href")).toBe("https://f1tv.formula1.com");

    act(() => {
      useRaceStore.getState().setSelectedDriverId("NOR");
    });

    expect(screen.getByText("#4 Lando Norris")).toBeTruthy();
    expect(screen.getByText("McLaren")).toBeTruthy();
    expect(screen.getByText("R2")).toBeTruthy();
    expect(screen.getByText("309 kph")).toBeTruthy();
    expect(screen.queryByText("지연 텔레메트리")).toBeNull();
    const updatedOnboardLink = screen.getByRole("link", { name: "공식 온보드 열기" });
    expect(updatedOnboardLink.getAttribute("href")).toBe("https://www.formula1.com/en/drivers/lando-norris");
  });

  it("stale 텔레메트리는 HUD에서 즉시 표시됨", () => {
    act(() => {
      const state = useRaceStore.getState();
      useRaceStore.setState({
        ticksByDriver: {
          ...state.ticksByDriver,
          VER: {
            ...state.ticksByDriver.VER,
            timestampMs: Date.now() - 16000
          }
        }
      });
    });

    render(<SelectedDriverHud />);

    expect(screen.getByText("지연 텔레메트리")).toBeTruthy();
  });

  it("fresh 텔레메트리는 임계치 전에는 과한 경고가 없음", () => {
    act(() => {
      const state = useRaceStore.getState();
      useRaceStore.setState({
        ticksByDriver: {
          ...state.ticksByDriver,
          VER: {
            ...state.ticksByDriver.VER,
            timestampMs: Date.now() - 5000
          }
        }
      });
    });

    render(<SelectedDriverHud />);
    expect(screen.queryByText("지연 텔레메트리")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(10001);
    });

    expect(screen.getByText("지연 텔레메트리")).toBeTruthy();
  });

  it("선택 드라이버는 있지만 tick이 없으면 HUD가 대기 상태를 보여줌", () => {
    act(() => {
      const state = useRaceStore.getState();
      const nextTicksByDriver = { ...state.ticksByDriver };
      delete nextTicksByDriver.VER;
      useRaceStore.setState({
        ticksByDriver: nextTicksByDriver
      });
    });

    render(<SelectedDriverHud />);

    expect(screen.getByText("#1 Max Verstappen")).toBeTruthy();
    expect(screen.getByText("텔레메트리 수신 대기 중")).toBeTruthy();
    expect(screen.queryByText("지연 텔레메트리")).toBeNull();
  });
});
