import { LapBoundaryTrigger, PredictionFeatureSnapshot, TelemetryTick } from "./contracts.js";

type RankTransition = Pick<LapBoundaryTrigger, "beforeRank" | "afterRank">;

export type BuildPredictionFeatureSnapshotInput = {
  sessionId: string;
  lap: number;
  triggerDriverId: string;
  ticks: TelemetryTick[];
  generatedAtMs?: number;
  rankTransition?: RankTransition | null;
};

const toSafeSpeed = (speedKph: number): number =>
  Number.isFinite(speedKph) && speedKph >= 0 ? speedKph : Number.NaN;

const toFixed1 = (value: number): string => value.toFixed(1);

export const toPredictionFeatureNote = (
  snapshot: Omit<PredictionFeatureSnapshot, "note">,
  rankTransition?: RankTransition | null
): string => {
  const rankText = rankTransition
    ? `rank ${rankTransition.beforeRank} -> ${rankTransition.afterRank}`
    : "rank n/a";

  return [
    rankText,
    `ticks=${snapshot.tickCount}`,
    `avg=${toFixed1(snapshot.averageSpeedKph)}`,
    `top=${toFixed1(snapshot.topSpeedKph)}`,
    `min=${toFixed1(snapshot.minSpeedKph)}`
  ].join(" | ");
};

export const buildPredictionFeatureSnapshot = (
  input: BuildPredictionFeatureSnapshotInput
): PredictionFeatureSnapshot => {
  const speeds = input.ticks
    .map((tick) => toSafeSpeed(tick.speedKph))
    .filter((speed): speed is number => Number.isFinite(speed));
  const tickCount = speeds.length;
  const averageSpeedKph = tickCount > 0
    ? speeds.reduce((sum, speed) => sum + speed, 0) / tickCount
    : 0;
  const topSpeedKph = tickCount > 0 ? Math.max(...speeds) : 0;
  const minSpeedKph = tickCount > 0 ? Math.min(...speeds) : 0;
  const generatedAtMs = input.generatedAtMs ?? Date.now();

  const snapshotBase: Omit<PredictionFeatureSnapshot, "note"> = {
    sessionId: input.sessionId,
    lap: input.lap,
    triggerDriverId: input.triggerDriverId,
    generatedAtMs,
    tickCount,
    averageSpeedKph,
    topSpeedKph,
    minSpeedKph
  };

  return {
    ...snapshotBase,
    note: toPredictionFeatureNote(snapshotBase, input.rankTransition)
  };
};
