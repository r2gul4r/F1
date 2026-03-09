import { AiPrediction, Driver, RaceFlag, Session, TelemetryTick } from "@f1/shared";
import { Repository } from "./repository.js";

export class MemoryRepository implements Repository {
  private session: Session | null = null;
  private drivers: Driver[] = [];
  private ticks: TelemetryTick[] = [];
  private flags: RaceFlag[] = [];
  private predictions: AiPrediction[] = [];

  async getCurrentSession(): Promise<Session | null> {
    return this.session ? { ...this.session } : null;
  }

  async upsertSession(session: Session): Promise<void> {
    this.session = { ...session };
  }

  async getDrivers(sessionId: string): Promise<Driver[]> {
    return this.drivers.filter((driver) => driver.sessionId === sessionId).map((driver) => ({ ...driver }));
  }

  async upsertDrivers(drivers: Driver[]): Promise<void> {
    this.drivers = drivers.map((driver) => ({ ...driver }));
  }

  async insertTelemetryTick(tick: TelemetryTick): Promise<void> {
    this.ticks = [...this.ticks, { ...tick }].slice(-20000);
  }

  async getRecentTelemetry(driverId: string, windowSec: number): Promise<TelemetryTick[]> {
    const cutoff = Date.now() - windowSec * 1000;
    return this.ticks
      .filter((tick) => tick.driverId === driverId && tick.timestampMs >= cutoff)
      .map((tick) => ({ ...tick }));
  }

  async getRecentSessionTicks(sessionId: string, limit: number): Promise<TelemetryTick[]> {
    return this.ticks
      .filter((tick) => tick.sessionId === sessionId)
      .slice(-limit)
      .map((tick) => ({ ...tick }));
  }

  async insertRaceFlag(flag: RaceFlag): Promise<void> {
    this.flags = [...this.flags, { ...flag }].slice(-2000);
  }

  async savePrediction(prediction: AiPrediction): Promise<void> {
    this.predictions = [...this.predictions, { ...prediction }].slice(-2000);
  }
}