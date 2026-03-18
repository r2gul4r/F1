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
    vi.restoreAllMocks();
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

  it("fallback 확률은 고속 입력에서도 합계 1을 유지함", async () => {
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
          { ...request.snapshot.ticks[0], speedKph: 1000 },
          { ...request.snapshot.ticks[0], speedKph: 1000, timestampMs: request.snapshot.ticks[0].timestampMs + 1 },
          { ...request.snapshot.ticks[0], speedKph: 1000, timestampMs: request.snapshot.ticks[0].timestampMs + 2 }
        ]
      }
    });

    const total = prediction.podiumProb.reduce((sum, value) => sum + value, 0);

    expect(total).toBeCloseTo(1, 6);
    expect(prediction.podiumProb[0]).toBeLessThanOrEqual(1);
    expect(prediction.podiumProb[1]).toBeGreaterThanOrEqual(0);
    expect(prediction.podiumProb[2]).toBeGreaterThanOrEqual(0);
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
    expect(result.reason).toBe("http_error");
    expect(prediction.reasoningSummary).toBe("모델 응답 실패로 보수적 추정 사용");
  });

  it("확률 파싱이 불가능하면 invalid_payload reason으로 fallback함", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response: "invalid output without probabilities"
        })
      })
    );

    const service = new AiService({
      baseUrl: "http://localhost:11434",
      model: "gemma3:12b"
    });

    const result = await service.predictWithStatus(request);

    expect(result.status).toBe("fallback");
    expect(result.reason).toBe("invalid_payload");
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

  it("예외가 발생하면 exception reason으로 fallback함", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );

    const service = new AiService({
      baseUrl: "http://localhost:11434",
      model: "gemma3:12b"
    });

    const result = await service.predictWithStatus(request);

    expect(result.status).toBe("fallback");
    expect(result.reason).toBe("exception");
    expect(result.prediction.reasoningSummary).toBe("요청 처리 실패");
    expect(result.prediction.reasoningSummary).not.toBe("모델 응답 시간 초과로 보수적 추정 사용");
  });

  it("AbortError 계열 실패는 timeout reason으로 fallback함", async () => {
    const abortError = new DOMException("The operation was aborted", "AbortError");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(abortError)
    );

    const service = new AiService({
      baseUrl: "http://localhost:11434",
      model: "gemma3:12b"
    });

    const result = await service.predictWithStatus(request);

    expect(result.status).toBe("fallback");
    expect(result.reason).toBe("timeout");
    expect(result.prediction.reasoningSummary).toBe("모델 응답 시간 초과로 보수적 추정 사용");
  });

  it("disabled provider는 fetch 호출 없이 즉시 fallback함", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const service = new AiService({
      provider: "disabled",
      model: "disabled"
    });

    const result = await service.predictWithStatus(request);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.status).toBe("fallback");
    expect(result.reason).toBe("disabled_provider");
    expect(result.prediction.reasoningSummary).toBe("모델 응답 실패로 보수적 추정 사용");
  });

  it("requestTimeoutMs override를 setTimeout에 반영함", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );
    const timeoutSpy = vi.spyOn(globalThis, "setTimeout");

    const service = new AiService({
      baseUrl: "http://localhost:11434",
      model: "gemma3:12b",
      requestTimeoutMs: 1234
    });

    await service.predictWithStatus(request);

    expect(timeoutSpy).toHaveBeenCalled();
    expect(timeoutSpy.mock.calls[0]?.[1]).toBe(1234);
  });

  it("requestTimeoutMs가 없으면 기본 5000ms를 사용함", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );
    const timeoutSpy = vi.spyOn(globalThis, "setTimeout");

    const service = new AiService({
      baseUrl: "http://localhost:11434",
      model: "gemma3:12b"
    });

    await service.predictWithStatus(request);

    expect(timeoutSpy).toHaveBeenCalled();
    expect(timeoutSpy.mock.calls[0]?.[1]).toBe(5000);
  });

  it("ollama prompt는 deterministic snapshot note를 포함함", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: "0.6,0.3,0.1\nOllama summary"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const service = new AiService({
      baseUrl: "http://localhost:11434",
      model: "gemma3:12b"
    });

    const result = await service.predictWithStatus({
      ...request,
      snapshot: {
        ...request.snapshot,
        note: "rank 6 -> 5 | ticks=2 | avg=313.0 | top=314.0 | min=312.0"
      }
    });

    expect(result.status).toBe("ok");
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as { prompt?: string };
    expect(body.prompt).toContain("note=rank 6 -&gt; 5 | ticks=2 | avg=313.0 | top=314.0 | min=312.0");
  });
});
