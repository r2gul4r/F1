import { describe, expect, it } from "vitest";
import {
  AiPrediction,
  createSessionSnapshot,
  Driver,
  initializeSelectionState,
  RaceFlag,
  reconcileSelectionState,
  reduceSessionSnapshot,
  TelemetryTick
} from "../src/index.js";

const sessionId = "session-1";

const ver: Driver = {
  id: "VER",
  sessionId,
  fullName: "Max Verstappen",
  number: 1,
  teamName: "Red Bull",
  deepLink: "https://example.com/ver"
};

const nor: Driver = {
  id: "NOR",
  sessionId,
  fullName: "Lando Norris",
  number: 4,
  teamName: "McLaren",
  deepLink: "https://example.com/nor"
};

const tick: TelemetryTick = {
  sessionId,
  driverId: ver.id,
  position: { x: 11, y: 22, z: 0 },
  speedKph: 312,
  lap: 5,
  rank: 1,
  timestampMs: 1000
};

const flag: RaceFlag = {
  sessionId,
  flagType: "GREEN",
  timestampMs: 2000
};

const prediction = (lap: number): AiPrediction => ({
  sessionId,
  lap,
  triggerDriverId: ver.id,
  podiumProb: [0.6, 0.3, 0.1],
  reasoningSummary: `lap ${lap}`,
  modelLatencyMs: 25,
  timestampMs: 1000 + lap
});

describe("session snapshot contract", () => {
  it("기본 스냅샷 초기값을 고정함", () => {
    expect(createSessionSnapshot()).toEqual({
      sessionId: null,
      drivers: [],
      latestTicksByDriver: {},
      flag: null,
      predictions: []
    });
  });

  it("이벤트 리듀서가 drivers/tick/flag/prediction 누적 규칙을 유지함", () => {
    let state = createSessionSnapshot(sessionId);
    state = reduceSessionSnapshot(state, { type: "drivers.set", drivers: [ver, nor] });
    state = reduceSessionSnapshot(state, { type: "telemetry.upsert", tick });
    state = reduceSessionSnapshot(state, { type: "flag.set", flag });
    state = reduceSessionSnapshot(state, { type: "prediction.add", prediction: prediction(1) }, { maxPredictions: 1 });
    state = reduceSessionSnapshot(state, { type: "prediction.add", prediction: prediction(2) }, { maxPredictions: 1 });

    expect(state.drivers).toEqual([ver, nor]);
    expect(state.latestTicksByDriver[ver.id]).toEqual(tick);
    expect(state.flag).toEqual(flag);
    expect(state.predictions).toEqual([prediction(2)]);
  });

  it("session.reset 이벤트가 상태를 초기화함", () => {
    let state = createSessionSnapshot(sessionId);
    state = reduceSessionSnapshot(state, { type: "drivers.set", drivers: [ver] });
    const next = reduceSessionSnapshot(state, {
      type: "session.reset",
      sessionId: "session-2"
    });

    expect(next).toEqual({
      sessionId: "session-2",
      drivers: [],
      latestTicksByDriver: {},
      flag: null,
      predictions: []
    });
  });

  it("다른 세션 이벤트가 들어오면 기존 세션 상태를 비우고 새 세션으로 전환함", () => {
    let state = createSessionSnapshot(sessionId);
    state = reduceSessionSnapshot(state, { type: "drivers.set", drivers: [ver, nor] });
    state = reduceSessionSnapshot(state, { type: "prediction.add", prediction: prediction(1) });

    const sessionTwoTick: TelemetryTick = {
      ...tick,
      sessionId: "session-2",
      driverId: "LEC"
    };

    const next = reduceSessionSnapshot(state, {
      type: "telemetry.upsert",
      tick: sessionTwoTick
    });

    expect(next).toEqual({
      sessionId: "session-2",
      drivers: [],
      latestTicksByDriver: {
        LEC: sessionTwoTick
      },
      flag: null,
      predictions: []
    });
  });

  it("선택 드라이버 초기화/보정 규칙을 고정함", () => {
    const snapshot = reduceSessionSnapshot(createSessionSnapshot(sessionId), {
      type: "drivers.set",
      drivers: [ver, nor]
    });
    const initial = initializeSelectionState(snapshot, nor.id);
    expect(initial).toEqual({ selectedDriverId: nor.id });

    const reconciled = reconcileSelectionState(snapshot, { selectedDriverId: "HAM" });
    expect(reconciled).toEqual({ selectedDriverId: ver.id });
  });
});
