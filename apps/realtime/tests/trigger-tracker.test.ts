import { describe, expect, it } from "vitest";
import { TriggerTracker } from "../src/services/trigger-tracker.js";

const createTick = (sessionId: string, driverId: string, lap: number, rank: number) => ({
  sessionId,
  driverId,
  position: {
    x: 0,
    y: 0,
    z: 0
  },
  speedKph: 300,
  lap,
  rank,
  timestampMs: Date.now()
});

describe("trigger tracker", () => {
  it("같은 드라이버가 lap을 넘길 때 순위 변화가 없어도 한 번만 trigger를 만듦", () => {
    const tracker = new TriggerTracker();

    expect(tracker.onTick(createTick("session-1", "HAM", 10, 6))).toEqual([]);

    const firstTrigger = tracker.onTick(createTick("session-1", "HAM", 11, 6));
    expect(firstTrigger).toHaveLength(1);
    expect(firstTrigger[0]?.triggerDriverId).toBe("HAM");
    expect(firstTrigger[0]?.lap).toBe(11);
    expect(firstTrigger[0]?.beforeRank).toBe(6);
    expect(firstTrigger[0]?.afterRank).toBe(6);

    expect(tracker.onTick(createTick("session-1", "HAM", 11, 5))).toEqual([]);
  });

  it("session이 다르면 lap 상태를 섞지 않음", () => {
    const tracker = new TriggerTracker();

    expect(tracker.onTick(createTick("session-1", "RUS", 10, 6))).toEqual([]);
    expect(tracker.onTick(createTick("session-2", "RUS", 11, 5))).toEqual([]);

    const trigger = tracker.onTick(createTick("session-1", "RUS", 11, 5));
    expect(trigger).toHaveLength(1);
    expect(trigger[0]?.sessionId).toBe("session-1");
  });
});
