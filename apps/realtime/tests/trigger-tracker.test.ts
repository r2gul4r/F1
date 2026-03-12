import { describe, expect, it } from "vitest";
import { TriggerTracker } from "../src/services/trigger-tracker.js";

const createTick = (sessionId: string, driverId: string, rank: number) => ({
  sessionId,
  driverId,
  position: {
    x: 0,
    y: 0,
    z: 0
  },
  speedKph: 300,
  lap: 10,
  rank,
  timestampMs: Date.now()
});

describe("trigger tracker", () => {
  it("같은 드라이버가 6위에서 5위로 올라갈 때 한 번만 trigger를 만듦", () => {
    const tracker = new TriggerTracker();

    expect(tracker.onTick(createTick("session-1", "HAM", 6))).toEqual([]);

    const firstTrigger = tracker.onTick(createTick("session-1", "HAM", 5));
    expect(firstTrigger).toHaveLength(1);
    expect(firstTrigger[0]?.triggerDriverId).toBe("HAM");

    expect(tracker.onTick(createTick("session-1", "HAM", 4))).toEqual([]);
  });

  it("session이 다르면 rank 상태를 섞지 않음", () => {
    const tracker = new TriggerTracker();

    expect(tracker.onTick(createTick("session-1", "RUS", 6))).toEqual([]);
    expect(tracker.onTick(createTick("session-2", "RUS", 5))).toEqual([]);

    const trigger = tracker.onTick(createTick("session-1", "RUS", 5));
    expect(trigger).toHaveLength(1);
    expect(trigger[0]?.sessionId).toBe("session-1");
  });
});
