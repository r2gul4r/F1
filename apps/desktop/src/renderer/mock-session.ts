import { Driver, RaceFlag, SessionSnapshot, createSessionSnapshot, reduceSessionSnapshot } from "@f1/core";
import { startTransition, useEffect, useMemo, useState } from "react";

const SESSION_ID = "desktop-mock-session";
const TICK_INTERVAL_MS = 90;

const drivers: Driver[] = [
  { id: "VER", fullName: "Max Verstappen", number: 1, teamName: "Red Bull" },
  { id: "NOR", fullName: "Lando Norris", number: 4, teamName: "McLaren" },
  { id: "LEC", fullName: "Charles Leclerc", number: 16, teamName: "Ferrari" },
  { id: "HAM", fullName: "Lewis Hamilton", number: 44, teamName: "Ferrari" },
  { id: "RUS", fullName: "George Russell", number: 63, teamName: "Mercedes" },
  { id: "ALO", fullName: "Fernando Alonso", number: 14, teamName: "Aston Martin" }
].map((driver) => ({
  ...driver,
  sessionId: SESSION_ID,
  deepLink: `https://example.com/${driver.id.toLowerCase()}`
}));

const toTrackPosition = (progress: number, laneOffset: number) => {
  const theta = progress * Math.PI * 2;
  const radius = 180 + Math.sin(theta * 2) * 22 + laneOffset * 8;
  const x = Math.cos(theta) * radius;
  const y = Math.sin(theta) * (118 + laneOffset * 3) + Math.cos(theta * 3) * 18;

  return {
    x,
    y,
    z: Math.max(-8, Math.min(16, Math.sin(theta * 2.5) * 10))
  };
};

const buildFlag = (tickCount: number, timestampMs: number): RaceFlag => ({
  sessionId: SESSION_ID,
  flagType: tickCount % 160 > 120 ? "YELLOW" : "GREEN",
  sector: tickCount % 160 > 120 ? "S2" : undefined,
  timestampMs
});

const buildSnapshot = (tickCount: number): SessionSnapshot => {
  const timestampMs = Date.now();
  let snapshot = reduceSessionSnapshot(createSessionSnapshot(SESSION_ID), {
    type: "drivers.set",
    drivers
  });

  const lap = Math.floor(tickCount / 48) + 1;
  const ordered = drivers.map((driver, index) => {
    const progress = ((tickCount * 0.0075 + index * 0.162) % 1 + 1) % 1;
    return {
      driver,
      progress
    };
  }).sort((left, right) => right.progress - left.progress);

  ordered.forEach(({ driver, progress }, index) => {
    snapshot = reduceSessionSnapshot(snapshot, {
      type: "telemetry.upsert",
      tick: {
        sessionId: SESSION_ID,
        driverId: driver.id,
        position: toTrackPosition(progress, index * 0.35),
        speedKph: 286 + ((tickCount + index * 11) % 32),
        lap,
        rank: index + 1,
        timestampMs
      }
    });
  });

  return reduceSessionSnapshot(snapshot, {
    type: "flag.set",
    flag: buildFlag(tickCount, timestampMs)
  });
};

export const useMockSession = (enabled = true) => {
  const [snapshot, setSnapshot] = useState<SessionSnapshot>(() => buildSnapshot(0));
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(drivers[0]?.id ?? null);
  const [focusModeEnabled, setFocusModeEnabled] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let tickCount = 0;
    const timer = window.setInterval(() => {
      tickCount += 1;
      startTransition(() => {
        setSnapshot(buildSnapshot(tickCount));
      });
    }, TICK_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [enabled]);

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
