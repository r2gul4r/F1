import type { Driver, TelemetryTick } from "@f1/core";

export type SelectedDriverDetail = {
  label: "Gap" | "Interval" | "Gear" | "RPM" | "Tire";
  value: string;
};

const tireCompounds = ["Soft", "Medium", "Hard"] as const;

export const buildSelectedDriverDetails = (
  selectedDriver: Driver | null,
  selectedTick: TelemetryTick | undefined
): SelectedDriverDetail[] => {
  if (!selectedDriver || !selectedTick) {
    return [];
  }

  const gapSeconds = (selectedTick.rank - 1) * 1.8;
  const intervalSeconds = selectedTick.rank > 1 ? 0.6 + ((selectedDriver.number + selectedTick.lap) % 5) * 0.2 : 0;
  const gear = Math.max(1, Math.min(8, Math.round(selectedTick.speedKph / 42)));
  const rpm = Math.round(8_400 + gear * 320 + (selectedTick.speedKph % 17) * 35);
  const tire = tireCompounds[(selectedDriver.number + selectedTick.lap) % tireCompounds.length] ?? "Medium";

  return [
    { label: "Gap", value: selectedTick.rank === 1 ? "Leader" : `+${gapSeconds.toFixed(1)}s` },
    { label: "Interval", value: selectedTick.rank === 1 ? "-" : `${intervalSeconds.toFixed(1)}s` },
    { label: "Gear", value: `G${gear}` },
    { label: "RPM", value: `${rpm}` },
    { label: "Tire", value: tire }
  ];
};
