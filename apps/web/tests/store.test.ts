import { beforeEach, describe, expect, it } from "vitest";
import { useRaceStore } from "../src/store/use-race-store";

describe("race store", () => {
  beforeEach(() => {
    useRaceStore.setState({
      drivers: [],
      ticksByDriver: {},
      selectedDriverId: null,
      flag: null,
      predictions: [],
      fps: 0
    });
  });

  it("드라이버를 설정하고 선택할 수 있음", () => {
    const state = useRaceStore.getState();
    state.setDrivers([
      {
        id: "VER",
        sessionId: "s1",
        fullName: "Max Verstappen",
        number: 1,
        teamName: "Red Bull",
        deepLink: "https://f1tv.formula1.com"
      }
    ]);
    state.setSelectedDriverId("VER");

    const next = useRaceStore.getState();
    expect(next.drivers).toHaveLength(1);
    expect(next.selectedDriverId).toBe("VER");
  });

  it("텔레메트리와 예측을 누적함", () => {
    const state = useRaceStore.getState();
    state.upsertTick({
      sessionId: "s1",
      driverId: "VER",
      position: { x: 1, y: 2, z: 0 },
      speedKph: 320,
      lap: 3,
      rank: 1,
      timestampMs: Date.now()
    });
    state.addPrediction({
      sessionId: "s1",
      lap: 3,
      triggerDriverId: "VER",
      podiumProb: [0.6, 0.3, 0.1],
      isFallback: false,
      reasoningSummary: "속도 우세",
      modelLatencyMs: 800,
      timestampMs: Date.now()
    });

    const next = useRaceStore.getState();
    expect(next.ticksByDriver.VER.rank).toBe(1);
    expect(next.predictions).toHaveLength(1);
  });

  it("session 경계가 바뀌면 live 상태를 초기화함", () => {
    const state = useRaceStore.getState();
    state.upsertTick({
      sessionId: "s1",
      driverId: "VER",
      position: { x: 1, y: 2, z: 0 },
      speedKph: 320,
      lap: 3,
      rank: 1,
      timestampMs: Date.now()
    });
    state.setSelectedDriverId("VER");
    state.setFlag({
      sessionId: "s1",
      flagType: "YELLOW",
      timestampMs: Date.now()
    });
    state.addPrediction({
      sessionId: "s1",
      lap: 3,
      triggerDriverId: "VER",
      podiumProb: [0.6, 0.3, 0.1],
      isFallback: true,
      reasoningSummary: "속도 우세",
      modelLatencyMs: 800,
      timestampMs: Date.now()
    });
    state.resetSessionState();

    const next = useRaceStore.getState();
    expect(next.drivers).toEqual([]);
    expect(next.ticksByDriver).toEqual({});
    expect(next.selectedDriverId).toBeNull();
    expect(next.flag).toBeNull();
    expect(next.predictions).toEqual([]);
  });
});
