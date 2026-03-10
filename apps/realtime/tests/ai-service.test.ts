import { afterEach, describe, expect, it, vi } from "vitest";
import { AiService } from "../src/services/ai-service.js";

const request = {
  sessionId: "session-1",
  lap: 10,
  triggerDriverId: "VER",
  snapshot: {
    ticks: [
      {
        sessionId: "session-1",
        driverId: "VER",
        position: { x: 1, y: 2, z: 3 },
        speedKph: 315,
        lap: 10,
        rank: 1,
        timestampMs: Date.now()
      }
    ]
  }
};

describe("ai service", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("모델 응답이 실패여도 보수적 fallback 메시지를 유지함", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({})
      })
    );

    const service = new AiService({
      baseUrl: "http://localhost:11434",
      model: "gemma3:12b"
    });

    const prediction = await service.predict(request);

    expect(prediction.reasoningSummary).toBe("모델 응답 실패로 보수적 추정 사용");
  });
});
