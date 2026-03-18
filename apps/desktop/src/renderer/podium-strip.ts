import type { DriverRailItem } from "./driver-rail";

export type PodiumStripItem = {
  driverId: string;
  rank: number;
  speedKph: number | null;
};

export const buildPodiumStripItems = (items: DriverRailItem[]): PodiumStripItem[] =>
  items
    .filter((item) => typeof item.tick?.rank === "number" && item.tick.rank <= 3)
    .slice(0, 3)
    .map((item) => ({
      driverId: item.driver.id,
      rank: item.tick?.rank ?? 0,
      speedKph: item.tick?.speedKph ?? null
    }));
