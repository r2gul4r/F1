import { describe, expect, it } from "vitest";
import { detectP5Trigger } from "../src/rules/p5-trigger.js";

describe("detectP5Trigger", () => {
  it("상위 5위 진입 시 트리거를 반환함", () => {
    const triggers = detectP5Trigger({
      sessionId: "s1",
      lap: 17,
      previousRanks: { VER: 1, RUS: 6 },
      nextRanks: { VER: 1, RUS: 5 },
      timestampMs: 1000
    });

    expect(triggers).toHaveLength(1);
    expect(triggers[0].triggerDriverId).toBe("RUS");
  });

  it("순위 변화가 없으면 빈 배열을 반환함", () => {
    const triggers = detectP5Trigger({
      sessionId: "s1",
      lap: 18,
      previousRanks: { VER: 1, RUS: 5 },
      nextRanks: { VER: 1, RUS: 5 },
      timestampMs: 2000
    });

    expect(triggers).toHaveLength(0);
  });
});