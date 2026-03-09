import { Driver, RaceFlag, Session, TelemetryTick } from "@f1/shared";

export type Snapshot = {
  session: Session;
  drivers: Driver[];
  ticks: TelemetryTick[];
  flag?: RaceFlag;
};

export interface TelemetrySource {
  pull(): Promise<Snapshot>;
}