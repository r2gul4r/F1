import type { Driver, SessionSnapshot, TelemetryTick } from "@f1/core";

export type DriverRailItem = {
  driver: Driver;
  tick: TelemetryTick | undefined;
  isLeader: boolean;
};

const byRankThenNumber = (left: DriverRailItem, right: DriverRailItem): number => {
  const leftRank = left.tick?.rank ?? Number.MAX_SAFE_INTEGER;
  const rightRank = right.tick?.rank ?? Number.MAX_SAFE_INTEGER;
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return left.driver.number - right.driver.number;
};

export const buildDriverRailItems = (snapshot: SessionSnapshot): DriverRailItem[] => {
  const items = snapshot.drivers.map((driver) => ({
    driver,
    tick: snapshot.latestTicksByDriver[driver.id],
    isLeader: false
  }));

  const ordered = [...items].sort(byRankThenNumber);
  if (ordered[0]?.tick?.rank === 1) {
    ordered[0].isLeader = true;
  }

  return ordered;
};
