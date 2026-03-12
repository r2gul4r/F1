import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SelectedDriverHud } from "../src/components/selected-driver-hud";
import { useRaceStore } from "../src/store/use-race-store";

describe("selected driver hud", () => {
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
      ticksByDriver: {
        VER: {
          sessionId: "session-1",
          driverId: "VER",
          position: { x: 1, y: 2, z: 0 },
          speedKph: 320,
          lap: 7,
          rank: 1,
          timestampMs: 1000
        },
        NOR: {
          sessionId: "session-1",
          driverId: "NOR",
          position: { x: 3, y: 4, z: 0 },
          speedKph: 309,
          lap: 7,
          rank: 2,
          timestampMs: 1001
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
  });

  it("선택 드라이버가 바뀌면 HUD 표시도 같이 바뀜", () => {
    render(<SelectedDriverHud />);

    expect(screen.getByText("#1 Max Verstappen")).toBeTruthy();
    expect(screen.getByText("Red Bull")).toBeTruthy();
    expect(screen.getByText("R1")).toBeTruthy();
    expect(screen.getByText(/업데이트 \d{2}:\d{2}:\d{2}/)).toBeTruthy();

    act(() => {
      useRaceStore.getState().setSelectedDriverId("NOR");
    });

    expect(screen.getByText("#4 Lando Norris")).toBeTruthy();
    expect(screen.getByText("McLaren")).toBeTruthy();
    expect(screen.getByText("R2")).toBeTruthy();
    expect(screen.getByText("309 kph")).toBeTruthy();
  });
});
