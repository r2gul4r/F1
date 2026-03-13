export const TELEMETRY_STALE_MS = 15000;

export type TelemetryFreshness = "fresh" | "stale" | "no telemetry";

export const isTelemetryStale = (timestampMs: number | undefined, currentMs: number): boolean =>
  typeof timestampMs === "number" && currentMs - timestampMs > TELEMETRY_STALE_MS;

export const getTelemetryFreshness = (
  timestampMs: number | undefined,
  currentMs: number
): TelemetryFreshness => {
  if (typeof timestampMs !== "number") {
    return "no telemetry";
  }

  return isTelemetryStale(timestampMs, currentMs) ? "stale" : "fresh";
};

export const getTelemetryPriority = (
  timestampMs: number | undefined,
  currentMs: number
): 0 | 1 | 2 => {
  if (typeof timestampMs !== "number") {
    return 2;
  }

  return isTelemetryStale(timestampMs, currentMs) ? 1 : 0;
};
