import { Driver, normalizeOpenF1TelemetryTicks, OpaqueError, OpenF1LocationRow, Session } from "@f1/shared";
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
    const ticks = normalizeOpenF1TelemetryTicks({
      sessionId: session.id,
      drivers,
      locationRows
    });

    return {
      session,
      drivers,
      ticks
    };
  }
}
