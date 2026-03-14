import { describe, expect, it } from "vitest";
import {
  getTelemetryFreshness,
  getTelemetryPriority,
  isTelemetryStale,
  TELEMETRY_STALE_MS
} from "../src/components/telemetry-freshness";

describe("telemetry freshness", () => {
  it("timestamp가 없으면 no telemetry와 최하 priority를 반환함", () => {
    expect(isTelemetryStale(undefined, 1000)).toBe(false);
    expect(getTelemetryFreshness(undefined, 1000)).toBe("no telemetry");
    expect(getTelemetryPriority(undefined, 1000)).toBe(2);
  });

  it("stale 임계값과 같으면 아직 fresh로 유지함", () => {
    const currentMs = 20000;
    const timestampMs = currentMs - TELEMETRY_STALE_MS;

    expect(isTelemetryStale(timestampMs, currentMs)).toBe(false);
    expect(getTelemetryFreshness(timestampMs, currentMs)).toBe("fresh");
    expect(getTelemetryPriority(timestampMs, currentMs)).toBe(0);
  });

  it("stale 임계값을 넘으면 stale과 중간 priority를 반환함", () => {
    const currentMs = 20000;
    const timestampMs = currentMs - TELEMETRY_STALE_MS - 1;

    expect(isTelemetryStale(timestampMs, currentMs)).toBe(true);
    expect(getTelemetryFreshness(timestampMs, currentMs)).toBe("stale");
    expect(getTelemetryPriority(timestampMs, currentMs)).toBe(1);
  });
});
