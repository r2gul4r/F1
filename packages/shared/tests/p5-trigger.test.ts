import { describe, expect, it } from "vitest";
import { detectLapBoundaryTrigger, detectP5Trigger } from "../src/rules/p5-trigger.js";

describe("detectLapBoundaryTrigger", () => {
  it("같은 드라이버의 lap이 증가하면 순위 변화가 없어도 트리거를 반환함", () => {
    const triggers = detectLapBoundaryTrigger({
      sessionId: "s1",
      triggerDriverId: "RUS",
      lap: 17,
      previousLap: 16,
      previousRank: 6,
      nextRank: 6,
      timestampMs: 1000
    });

    expect(triggers).toHaveLength(1);
    expect(triggers[0].triggerDriverId).toBe("RUS");
    expect(triggers[0].beforeRank).toBe(6);
    expect(triggers[0].afterRank).toBe(6);
  });

  it("같은 lap 안에서는 순위가 올라가도 빈 배열을 반환함", () => {
    const triggers = detectLapBoundaryTrigger({
      sessionId: "s1",
      triggerDriverId: "RUS",
      lap: 18,
      previousLap: 18,
      previousRank: 6,
      nextRank: 5,
      timestampMs: 2000
    });

    expect(triggers).toHaveLength(0);
  });
});

describe("detectP5Trigger", () => {
  it("legacy top5 trigger contract를 유지함", () => {
    const triggers = detectP5Trigger({
      sessionId: "s1",
      lap: 21,
      previousRanks: { VER: 1, RUS: 6 },
      nextRanks: { VER: 1, RUS: 5 },
      timestampMs: 3000
    });

    expect(triggers).toHaveLength(1);
    expect(triggers[0].triggerDriverId).toBe("RUS");
    expect(triggers[0].beforeRank).toBe(6);
    expect(triggers[0].afterRank).toBe(5);
  });
});
