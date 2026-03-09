import { detectP5Trigger, P5Trigger, TelemetryTick } from "@f1/shared";

export class TriggerTracker {
  private rankBySession: Record<string, Record<string, number>> = {};

  onTick(tick: TelemetryTick): P5Trigger[] {
    const previousRanks = this.rankBySession[tick.sessionId] ?? {};
    const nextRanks = { ...previousRanks, [tick.driverId]: tick.rank };
    this.rankBySession = { ...this.rankBySession, [tick.sessionId]: nextRanks };

    return detectP5Trigger({
      sessionId: tick.sessionId,
      lap: tick.lap,
      previousRanks,
      nextRanks,
      timestampMs: tick.timestampMs
    });
  }
}