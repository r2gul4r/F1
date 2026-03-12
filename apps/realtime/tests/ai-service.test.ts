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

  it("fallback 확률은 최근 3개 speed 평균으로 계산함", async () => {
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

    const prediction = await service.predict({
      ...request,
      snapshot: {
        ticks: [
          { ...request.snapshot.ticks[0], speedKph: 300 },
          { ...request.snapshot.ticks[0], speedKph: 330, timestampMs: request.snapshot.ticks[0].timestampMs + 1 },
          { ...request.snapshot.ticks[0], speedKph: 360, timestampMs: request.snapshot.ticks[0].timestampMs + 2 }
        ]
      }
    });

    expect(prediction.podiumProb[0]).toBeCloseTo(0.525, 6);
    expect(prediction.podiumProb[1]).toBeCloseTo(0.3125, 6);
    expect(prediction.podiumProb[2]).toBeCloseTo(0.1625, 6);
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

    const result = await service.predictWithStatus(request);
    const prediction = result.prediction;

    expect(result.status).toBe("fallback");
    expect(prediction.reasoningSummary).toBe("모델 응답 실패로 보수적 추정 사용");
  });

  it("gemini provider 요청은 공식 REST shape를 사용함", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: "0.6,0.3,0.1\nGemini summary"
                }
              ]
            }
          }
        ]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const service = new AiService({
      provider: "gemini",
      model: "gemini-2.5-flash",
      apiKey: "gemini-api-key-for-test-123456"
    });

    const result = await service.predictWithStatus(request);
    const prediction = result.prediction;

    expect(result.status).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": "gemini-api-key-for-test-123456"
      }
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: expect.any(String)
            }
          ]
        }
      ]
    });
    expect(prediction.reasoningSummary).toBe("Gemini summary");
    expect(prediction.podiumProb[0]).toBeCloseTo(0.6, 6);
    expect(prediction.podiumProb[1]).toBeCloseTo(0.3, 6);
    expect(prediction.podiumProb[2]).toBeCloseTo(0.1, 6);
  });
});
