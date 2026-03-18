import type { AiPrediction, Driver, RaceFlag, SessionSnapshot } from "./contracts.js";
import { createSessionSnapshot, reduceSessionSnapshot } from "./session-snapshot.js";

export const REPLAY_DEMO_SESSION_ID = "desktop-replay-session";
export const REPLAY_DEMO_TIMESTAMP_MS = new Date("2026-03-15T06:32:10.000Z").getTime();
const REPLAY_TELEMETRY_AGE_MS = 1_200;
const REPLAY_FLAG_AGE_MS = 700;

export const replayDemoDrivers: Driver[] = [
  { id: "NOR", fullName: "Lando Norris", number: 4, teamName: "McLaren" },
  { id: "VER", fullName: "Max Verstappen", number: 1, teamName: "Red Bull" },
  { id: "LEC", fullName: "Charles Leclerc", number: 16, teamName: "Ferrari" },
  { id: "RUS", fullName: "George Russell", number: 63, teamName: "Mercedes" }
].map((driver) => ({
  ...driver,
  sessionId: REPLAY_DEMO_SESSION_ID,
  deepLink: `https://example.com/replay/${driver.id.toLowerCase()}`
}));

const replayTicks = [
  { driverId: "NOR", rank: 1, speedKph: 318, lap: 27, position: { x: 162, y: 12, z: 10 } },
  { driverId: "VER", rank: 2, speedKph: 315, lap: 27, position: { x: 118, y: 68, z: 8 } },
  { driverId: "LEC", rank: 3, speedKph: 309, lap: 27, position: { x: -52, y: 122, z: 3 } },
  { driverId: "RUS", rank: 4, speedKph: 304, lap: 27, position: { x: -136, y: -14, z: -2 } }
] as const;

const replayPredictions: AiPrediction[] = [
  {
    sessionId: REPLAY_DEMO_SESSION_ID,
    lap: 26,
    triggerDriverId: "VER",
    podiumProb: [0.56, 0.27, 0.17],
    isFallback: false,
    fallbackReason: undefined,
    reasoningSummary: "Replay lap 26 prediction stabilized around Verstappen pressure on the front pair.",
    modelLatencyMs: 188,
    timestampMs: REPLAY_DEMO_TIMESTAMP_MS - 18_000
  },
  {
    sessionId: REPLAY_DEMO_SESSION_ID,
    lap: 27,
    triggerDriverId: "NOR",
    podiumProb: [0.63, 0.24, 0.13],
    isFallback: false,
    fallbackReason: undefined,
    reasoningSummary: "Replay lap 27 prediction favors Norris after the latest pace delta and clean air advantage.",
    modelLatencyMs: 164,
    timestampMs: REPLAY_DEMO_TIMESTAMP_MS
  }
];

const replayFlag: RaceFlag = {
  sessionId: REPLAY_DEMO_SESSION_ID,
  flagType: "GREEN",
  timestampMs: REPLAY_DEMO_TIMESTAMP_MS
};

export const buildReplayDemoSnapshot = (baseNowMs: number = Date.now()): SessionSnapshot => {
  const telemetryTimestampMs = baseNowMs - REPLAY_TELEMETRY_AGE_MS;
  const flagTimestampMs = baseNowMs - REPLAY_FLAG_AGE_MS;

  let snapshot = reduceSessionSnapshot(createSessionSnapshot(REPLAY_DEMO_SESSION_ID), {
    type: "drivers.set",
    drivers: replayDemoDrivers
  });

  replayTicks.forEach((tick) => {
    snapshot = reduceSessionSnapshot(snapshot, {
      type: "telemetry.upsert",
      tick: {
        sessionId: REPLAY_DEMO_SESSION_ID,
        driverId: tick.driverId,
        position: tick.position,
        speedKph: tick.speedKph,
        lap: tick.lap,
        rank: tick.rank,
        timestampMs: telemetryTimestampMs
      }
    });
  });

  replayPredictions.forEach((prediction) => {
    snapshot = reduceSessionSnapshot(snapshot, {
      type: "prediction.add",
      prediction: {
        ...prediction,
        timestampMs: baseNowMs - (REPLAY_DEMO_TIMESTAMP_MS - prediction.timestampMs)
      }
    });
  });

  return reduceSessionSnapshot(snapshot, {
    type: "flag.set",
    flag: {
      ...replayFlag,
      timestampMs: flagTimestampMs
    }
  });
};
