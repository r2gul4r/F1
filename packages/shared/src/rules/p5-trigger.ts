export type RankByDriver = Record<string, number>;

export type P5Trigger = {
  sessionId: string;
  lap: number;
  triggerDriverId: string;
  beforeRank: number;
  afterRank: number;
  timestampMs: number;
};

export const detectP5Trigger = (input: {
  sessionId: string;
  lap: number;
  previousRanks: RankByDriver;
  nextRanks: RankByDriver;
  timestampMs: number;
}): P5Trigger[] => {
  const driverIds = Object.keys(input.nextRanks);
  return driverIds
    .map((driverId) => {
      const beforeRank = input.previousRanks[driverId];
      const afterRank = input.nextRanks[driverId];
      const enteredTop5 = beforeRank !== undefined && beforeRank > 5 && afterRank <= 5;
      return enteredTop5
        ? {
            sessionId: input.sessionId,
            lap: input.lap,
            triggerDriverId: driverId,
            beforeRank,
            afterRank,
            timestampMs: input.timestampMs
          }
        : undefined;
    })
    .filter((value): value is P5Trigger => value !== undefined);
};