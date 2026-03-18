import { detectLapBoundaryTrigger, LapBoundaryTrigger, TelemetryTick } from "@f1/shared";

export class TriggerTracker {
  private lapBySession: Record<string, Record<string, number>> = {};
  private rankBySession: Record<string, Record<string, number>> = {};

  onTick(tick: TelemetryTick): LapBoundaryTrigger[] {
    const previousLaps = this.lapBySession[tick.sessionId] ?? {};
    const previousRanks = this.rankBySession[tick.sessionId] ?? {};
    const nextLaps = { ...previousLaps, [tick.driverId]: tick.lap };
    const nextRanks = { ...previousRanks, [tick.driverId]: tick.rank };
    this.lapBySession = { ...this.lapBySession, [tick.sessionId]: nextLaps };
    this.rankBySession = { ...this.rankBySession, [tick.sessionId]: nextRanks };

    return detectLapBoundaryTrigger({
      sessionId: tick.sessionId,
      triggerDriverId: tick.driverId,
      lap: tick.lap,
      previousLap: previousLaps[tick.driverId],
      previousRank: previousRanks[tick.driverId],
      nextRank: tick.rank,
      timestampMs: tick.timestampMs
    });
  }
}
