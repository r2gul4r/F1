import { AiPrediction, Driver, RaceFlag, Session, TelemetryTick } from "@f1/shared";

export interface Repository {
  getCurrentSession(): Promise<Session | null>;
  upsertSession(session: Session): Promise<void>;
  getDrivers(sessionId: string): Promise<Driver[]>;
  upsertDrivers(drivers: Driver[]): Promise<void>;
  insertTelemetryTick(tick: TelemetryTick): Promise<void>;
  getRecentTelemetry(driverId: string, windowSec: number): Promise<TelemetryTick[]>;
  getRecentSessionTicks(sessionId: string, limit: number): Promise<TelemetryTick[]>;
  insertRaceFlag(flag: RaceFlag): Promise<void>;
  savePrediction(prediction: AiPrediction): Promise<void>;
}