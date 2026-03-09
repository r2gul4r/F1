import { Driver, Session, TelemetryTick } from "@f1/shared";
import { OpaqueError } from "@f1/shared";
import { Snapshot, TelemetrySource } from "./types.js";

type OpenF1SessionRow = {
  session_key: number;
  session_name: string;
  date_start: string;
};

type OpenF1DriverRow = {
  driver_number: number;
  full_name: string;
  team_name: string;
  name_acronym: string;
};

type OpenF1LocationRow = {
  date: string;
  x: number;
  y: number;
  z: number;
  speed: number;
  n_gear?: number;
  driver_number: number;
};

const toSession = (row: OpenF1SessionRow): Session => ({
  id: String(row.session_key),
  name: row.session_name,
  startsAt: new Date(row.date_start).toISOString(),
  isCurrent: true
});

const toDrivers = (sessionId: string, rows: OpenF1DriverRow[]): Driver[] =>
  rows.map((row) => ({
    id: row.name_acronym,
    sessionId,
    fullName: row.full_name,
    number: row.driver_number,
    teamName: row.team_name,
    deepLink: `https://f1tv.formula1.com/search?q=${encodeURIComponent(row.full_name)}`
  }));

const buildRankMap = (ticks: TelemetryTick[]): Record<string, number> => {
  const ordered = [...ticks].sort((left, right) => right.speedKph - left.speedKph);
  return ordered.reduce<Record<string, number>>((acc, item, index) => ({
    ...acc,
    [item.driverId]: index + 1
  }), {});
};

export const buildOpenF1Headers = (apiKey: string): Record<string, string> => ({
  authorization: `Bearer ${apiKey}`,
  "x-api-key": apiKey
});

export class OpenF1Source implements TelemetrySource {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string
  ) {}

  private async requestJson<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        headers: buildOpenF1Headers(this.apiKey),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new OpaqueError();
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  async pull(): Promise<Snapshot> {
    const sessions = await this.requestJson<OpenF1SessionRow[]>("/sessions?session_key=latest");
    const current = sessions[0];
    if (!current) {
      throw new OpaqueError();
    }

    const session = toSession(current);
    const [driversRows, locationRows] = await Promise.all([
      this.requestJson<OpenF1DriverRow[]>(`/drivers?session_key=${current.session_key}`),
      this.requestJson<OpenF1LocationRow[]>(`/location?session_key=${current.session_key}`)
    ]);

    const drivers = toDrivers(session.id, driversRows);
    const rankSeed = locationRows
      .slice(-drivers.length)
      .map((row) => ({
        sessionId: session.id,
        driverId: drivers.find((driver) => driver.number === row.driver_number)?.id ?? String(row.driver_number),
        position: {
          x: row.x,
          y: row.y,
          z: row.z
        },
        speedKph: row.speed,
        lap: 0,
        rank: 0,
        timestampMs: new Date(row.date).getTime()
      }));

    const rankMap = buildRankMap(rankSeed);

    const ticks = rankSeed.map((tick) => ({
      ...tick,
      rank: rankMap[tick.driverId] ?? 20
    }));

    return {
      session,
      drivers,
      ticks
    };
  }
}
