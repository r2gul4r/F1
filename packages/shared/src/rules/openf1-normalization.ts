import type { Driver } from "../schemas/rest.js";
import type { TelemetryTick } from "../schemas/ws-events.js";

export type OpenF1LocationRow = {
  date: string;
  x: number;
  y: number;
  z: number;
  speed: number;
  driver_number: number;
};

const openF1LapFallback = 0;

const resolveDriverId = (drivers: Driver[], driverNumber: number): string =>
  drivers.find((driver) => driver.number === driverNumber)?.id ?? String(driverNumber);

const buildLatestTickByDriver = (
  sessionId: string,
  drivers: Driver[],
  locationRows: OpenF1LocationRow[]
): Record<string, TelemetryTick> =>
  locationRows.reduce<Record<string, TelemetryTick>>((acc, row) => {
    const driverId = resolveDriverId(drivers, row.driver_number);
    const timestampMs = new Date(row.date).getTime();
    const current = acc[driverId];

    if (!Number.isFinite(timestampMs) || timestampMs <= 0) {
      return acc;
    }

    if (current && current.timestampMs > timestampMs) {
      return acc;
    }

    return {
      ...acc,
      [driverId]: {
        sessionId,
        driverId,
        position: {
          x: row.x,
          y: row.y,
          z: row.z
        },
        speedKph: row.speed,
        lap: openF1LapFallback,
        rank: 0,
        timestampMs
      }
    };
  }, {});

const buildRankMap = (ticks: TelemetryTick[]): Record<string, number> => {
  const ordered = [...ticks].sort((left, right) => right.speedKph - left.speedKph || left.driverId.localeCompare(right.driverId));
  return ordered.reduce<Record<string, number>>(
    (acc, tick, index) => ({
      ...acc,
      [tick.driverId]: index + 1
    }),
    {}
  );
};

export const normalizeOpenF1TelemetryTicks = (input: {
  sessionId: string;
  drivers: Driver[];
  locationRows: OpenF1LocationRow[];
}): TelemetryTick[] => {
  const latestTickByDriver = buildLatestTickByDriver(input.sessionId, input.drivers, input.locationRows);
  const ticks = Object.values(latestTickByDriver);
  const rankByDriver = buildRankMap(ticks);

  return ticks
    .map((tick) => ({
      ...tick,
      rank: rankByDriver[tick.driverId] ?? ticks.length + 1
    }))
    .sort((left, right) => left.rank - right.rank || left.driverId.localeCompare(right.driverId));
};
