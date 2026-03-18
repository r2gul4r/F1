import { resolveFreshnessSummary, type Driver, type SessionSnapshot, type TelemetryFreshness, type TelemetryTick } from "@f1/core";

export type DriverRailItem = {
  driver: Driver;
  tick: TelemetryTick | undefined;
  isLeader: boolean;
  freshness: TelemetryFreshness;
  freshnessLabel: string;
};

type BuildDriverRailItemsInput = {
  nowMs: number;
  telemetryStaleMs: number;
};

const toFreshnessLabel = (freshness: TelemetryFreshness): string => {
  if (freshness === "fresh") {
    return "정상";
  }

  if (freshness === "stale") {
    return "지연";
  }

  return "미수신";
};

const byRankThenNumber = (left: DriverRailItem, right: DriverRailItem): number => {
  const leftRank = left.tick?.rank ?? Number.MAX_SAFE_INTEGER;
  const rightRank = right.tick?.rank ?? Number.MAX_SAFE_INTEGER;
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return left.driver.number - right.driver.number;
};

export const buildDriverRailItems = (
  snapshot: SessionSnapshot,
  input: BuildDriverRailItemsInput
): DriverRailItem[] => {
  const items = snapshot.drivers.map((driver) => {
    const tick = snapshot.latestTicksByDriver[driver.id];
    const freshness = resolveFreshnessSummary(tick?.timestampMs, input.nowMs, input.telemetryStaleMs).freshness;

    return {
      driver,
      tick,
      isLeader: false,
      freshness,
      freshnessLabel: toFreshnessLabel(freshness)
    };
  });

  const ordered = [...items].sort(byRankThenNumber);
  if (ordered[0]?.tick?.rank === 1) {
    ordered[0].isLeader = true;
  }

  return ordered;
};
