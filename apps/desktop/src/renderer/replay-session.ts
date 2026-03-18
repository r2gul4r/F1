import { AiPrediction, Driver, RaceFlag, SessionSnapshot, createSessionSnapshot, reduceSessionSnapshot } from "@f1/core";
import { useMemo, useState } from "react";

const SESSION_ID = "desktop-replay-session";
const REPLAY_TIMESTAMP_MS = new Date("2026-03-15T06:32:10.000Z").getTime();

const replayDrivers: Driver[] = [
  { id: "NOR", fullName: "Lando Norris", number: 4, teamName: "McLaren" },
  { id: "VER", fullName: "Max Verstappen", number: 1, teamName: "Red Bull" },
  { id: "LEC", fullName: "Charles Leclerc", number: 16, teamName: "Ferrari" },
  { id: "RUS", fullName: "George Russell", number: 63, teamName: "Mercedes" }
].map((driver) => ({
  ...driver,
  sessionId: SESSION_ID,
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
    sessionId: SESSION_ID,
    lap: 26,
    triggerDriverId: "VER",
    podiumProb: [0.56, 0.27, 0.17],
    isFallback: false,
    fallbackReason: undefined,
    reasoningSummary: "Replay lap 26 prediction stabilized around Verstappen pressure on the front pair.",
    modelLatencyMs: 188,
    timestampMs: REPLAY_TIMESTAMP_MS - 18_000
  },
  {
    sessionId: SESSION_ID,
    lap: 27,
    triggerDriverId: "NOR",
    podiumProb: [0.63, 0.24, 0.13],
    isFallback: false,
    fallbackReason: undefined,
    reasoningSummary: "Replay lap 27 prediction favors Norris after the latest pace delta and clean air advantage.",
    modelLatencyMs: 164,
    timestampMs: REPLAY_TIMESTAMP_MS
  }
];

const replayFlag: RaceFlag = {
  sessionId: SESSION_ID,
  flagType: "GREEN",
  timestampMs: REPLAY_TIMESTAMP_MS
};

export const buildReplaySnapshot = (): SessionSnapshot => {
  let snapshot = reduceSessionSnapshot(createSessionSnapshot(SESSION_ID), {
    type: "drivers.set",
    drivers: replayDrivers
  });

  replayTicks.forEach((tick) => {
    snapshot = reduceSessionSnapshot(snapshot, {
      type: "telemetry.upsert",
      tick: {
        sessionId: SESSION_ID,
        driverId: tick.driverId,
        position: tick.position,
        speedKph: tick.speedKph,
        lap: tick.lap,
        rank: tick.rank,
        timestampMs: REPLAY_TIMESTAMP_MS
      }
    });
  });

  replayPredictions.forEach((prediction) => {
    snapshot = reduceSessionSnapshot(snapshot, {
      type: "prediction.add",
      prediction
    });
  });

  return reduceSessionSnapshot(snapshot, {
    type: "flag.set",
    flag: replayFlag
  });
};

export const useReplaySession = (enabled = true) => {
  const snapshot = useMemo(() => (enabled ? buildReplaySnapshot() : createSessionSnapshot(SESSION_ID)), [enabled]);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(replayDrivers[0]?.id ?? null);
  const [focusModeEnabled, setFocusModeEnabled] = useState(false);

  const selectedDriver = useMemo(
    () => snapshot.drivers.find((driver) => driver.id === selectedDriverId) ?? null,
    [selectedDriverId, snapshot.drivers]
  );

  return {
    snapshot,
    selectedDriver,
    selectedDriverId,
    setSelectedDriverId,
    focusModeEnabled,
    setFocusModeEnabled
  };
};
