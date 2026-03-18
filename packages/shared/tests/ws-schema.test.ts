import { describe, expect, it } from "vitest";
import { wsEventSchema } from "../src/schemas/ws-events.js";

describe("wsEventSchema", () => {
  it("유효한 telemetry 이벤트를 통과시킴", () => {
    const parsed = wsEventSchema.parse({
      type: "telemetry.tick",
      payload: {
        sessionId: "s1",
        driverId: "VER",
        position: { x: 1, y: 2, z: 3 },
        speedKph: 301,
        lap: 4,
        rank: 1,
        timestampMs: Date.now()
      }
    });

    expect(parsed.type).toBe("telemetry.tick");
  });

  it("podium 확률 길이가 3이 아니면 실패함", () => {
    const parsed = wsEventSchema.safeParse({
      type: "ai.prediction",
      payload: {
        sessionId: "s1",
        lap: 2,
        triggerDriverId: "NOR",
        podiumProb: [0.3, 0.4],
        isFallback: false,
        reasoningSummary: "x",
        modelLatencyMs: 100,
        timestampMs: Date.now()
      }
    });

    expect(parsed.success).toBe(false);
  });
});
