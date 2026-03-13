import { Driver, normalizeOpenF1TelemetryTicks, OpaqueError, OpenF1LocationRow, Session } from "@f1/shared";
import { Snapshot, TelemetrySource } from "./types.js";

type OpenF1SessionRow = {
  session_key: number;
  session_name: string;
  date_start: string;
};

type OpenF1DriverRow = {
  driver_number: number;
  full_name?: string | null;
  team_name?: string | null;
  name_acronym?: string | null;
};

const normalizeDriverId = (row: OpenF1DriverRow): string => {
  const normalized = String(row.name_acronym ?? "").trim();
  return normalized.length > 0 ? normalized : String(row.driver_number);
};

const normalizeDriverFullName = (row: OpenF1DriverRow): string => {
  const normalized = String(row.full_name ?? "").trim();
  return normalized.length > 0 ? normalized : String(row.driver_number);
};

const normalizeDriverTeamName = (row: OpenF1DriverRow): string => {
  const normalized = String(row.team_name ?? "").trim();
  return normalized.length > 0 ? normalized : "Unknown Team";
};

const toSession = (row: OpenF1SessionRow): Session => ({
  id: String(row.session_key),
  name: row.session_name,
  startsAt: new Date(row.date_start).toISOString(),
  isCurrent: true
});

const toDrivers = (sessionId: string, rows: OpenF1DriverRow[]): Driver[] =>
  rows.map((row) => ({
    id: normalizeDriverId(row),
    sessionId,
    fullName: normalizeDriverFullName(row),
    number: row.driver_number,
    teamName: normalizeDriverTeamName(row),
    deepLink: `https://f1tv.formula1.com/search?q=${encodeURIComponent(normalizeDriverFullName(row))}`
  }));

export const buildOpenF1Headers = (apiKey: string): Record<string, string> => ({
  authorization: `Bearer ${apiKey}`,
  "x-api-key": apiKey
});

const DEFAULT_REQUEST_TIMEOUT_MS = 5000;

export class OpenF1Source implements TelemetrySource {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly requestTimeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS
  ) {}

  private async requestJson<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

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
