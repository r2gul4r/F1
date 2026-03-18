import type { AiPrediction, Driver, RaceFlag, TelemetryTick } from "@f1/shared";

export type { AiPrediction, Driver, RaceFlag, TelemetryTick };

export type SessionSnapshot = {
  sessionId: string | null;
  drivers: Driver[];
  latestTicksByDriver: Record<string, TelemetryTick>;
  flag: RaceFlag | null;
  predictions: AiPrediction[];
};

export type SessionSnapshotEvent =
  | {
      type: "session.reset";
      sessionId: string | null;
    }
  | {
      type: "drivers.set";
      drivers: Driver[];
    }
  | {
      type: "telemetry.upsert";
      tick: TelemetryTick;
    }
  | {
      type: "flag.set";
      flag: RaceFlag;
    }
  | {
      type: "prediction.add";
      prediction: AiPrediction;
    };

export type SelectionState = {
  selectedDriverId: string | null;
};

export type TrackPoint = {
  x: number;
  y: number;
};

export type TrackModel = {
  points: TrackPoint[];
  center: TrackPoint;
  halfHeight: number;
};

export type CarVisualState = {
  selected: boolean;
  focus: boolean;
  haloOpacity: number;
  haloScale: number;
  opacity: number;
  scale: number;
};

export type CarState = {
  driverId: string;
  rank: number | null;
  speedKph: number | null;
  position: {
    x: number;
    y: number;
    z: number;
  } | null;
  smoothedPosition: {
    x: number;
    y: number;
    z: number;
  } | null;
  freshness: TelemetryFreshness;
  visual: CarVisualState;
};

export type CameraState = {
  x: number;
  y: number;
  focusModeEnabled: boolean;
};

export type RendererFrameInput = {
  nowMs: number;
  telemetryStaleMs: number;
  selectedDriverId: string | null;
  snapshot: SessionSnapshot;
  previousCarsByDriver: Record<string, CarState>;
  camera: CameraState;
  track: TrackModel;
};

export type TelemetryFreshness = "fresh" | "stale" | "no telemetry";

export type FreshnessSummary = {
  freshness: TelemetryFreshness;
  isStale: boolean;
  priority: 0 | 1 | 2;
  staleAfterMs: number | null;
};

export type SelectedDriverSummary = {
  driverId: string;
  number: number;
  fullName: string;
  teamName: string;
};

export type TelemetryCardValue = {
  key: "rank" | "lap" | "speed" | "rpm" | "gear" | "gap" | "interval" | "tire" | "updatedAt";
  label: string;
  value: string | number;
};

export type PredictionContext = {
  latestPrediction: AiPrediction | null;
  selectedDriverPrediction: AiPrediction | null;
  visiblePrediction: AiPrediction | null;
  selectedDriverPriority: boolean;
  selectedPredictionStale: boolean;
  staleGapSeconds: number | null;
};

export type PredictionViewModel = {
  context: PredictionContext;
  elapsedSeconds: number | null;
};

export type HudViewModel = {
  selectedDriver: SelectedDriverSummary | null;
  freshness: FreshnessSummary;
  flagSummary: string;
  telemetryCards: TelemetryCardValue[];
  prediction: PredictionContext;
};

export type PredictionFeatureSnapshot = {
  sessionId: string;
  lap: number;
  triggerDriverId: string;
  generatedAtMs: number;
  tickCount: number;
  averageSpeedKph: number;
  topSpeedKph: number;
  minSpeedKph: number;
  note: string;
};

export type PredictionFallbackContext = {
  reason: "http_error" | "invalid_payload" | "exception" | "disabled_provider" | "timeout" | "empty_snapshot";
  fallbackSummary: string;
  latencyMs: number;
};

export type LapBoundaryTrigger = {
  sessionId: string;
  lap: number;
  triggerDriverId: string;
  beforeRank: number;
  afterRank: number;
  timestampMs: number;
};
