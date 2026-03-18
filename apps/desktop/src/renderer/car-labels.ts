import type { CarState } from "@f1/core";

export type CarLabel = {
  driverId: string;
  text: string;
  tone: "leader" | "selected";
};

export const buildCarLabels = (cars: CarState[]): CarLabel[] => {
  const leader = cars.find((car) => car.rank === 1 && car.smoothedPosition);
  const selected = cars.find((car) => car.visual.selected && car.smoothedPosition);
  const labels: CarLabel[] = [];

  if (leader) {
    labels.push({
      driverId: leader.driverId,
      text: `Leader · ${leader.driverId}`,
      tone: "leader"
    });
  }

  if (selected && selected.driverId !== leader?.driverId) {
    labels.push({
      driverId: selected.driverId,
      text: `Focus · ${selected.driverId}`,
      tone: "selected"
    });
  }

  return labels;
};
