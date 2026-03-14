import { afterEach, describe, expect, it, vi } from "vitest";
import { RealtimeClient, RealtimeClientError } from "../src/realtime-client.js";

const session = {
  id: "session-1",
  name: "Bahrain GP",
  startsAt: new Date().toISOString(),
  isCurrent: true
};

const drivers = [
  {
    id: "VER",
    sessionId: "session-1",
    fullName: "Max Verstappen",
    number: 1,
    teamName: "Red Bull",
    deepLink: "https://f1tv.formula1.com"
  }
];

const tick = {
  sessionId: "session-1",
  driverId: "VER",
  position: { x: 1, y: 2, z: 3 },
  speedKph: 320,
  lap: 5,
  rank: 1,
  timestampMs: Date.now()
};

const createAbortableFetchMock = () =>
  vi.fn().mockImplementation((_input: unknown, init?: { signal?: AbortSignal }) => {
    return new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        const abortError = new Error("aborted");
        abortError.name = "AbortError";
        reject(abortError);
      });
    });
  });

describe("realtime client", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("session sync 요청을 내부 계약 shape로 전송함", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new RealtimeClient("http://localhost:4001", "internal-token");
    await client.syncSession(session, drivers);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4001/internal/session",
      expect.objectContaining({
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-token": "internal-token"
        },
        body: JSON.stringify({ session, drivers })
      })
    );
  });

  it("내부 API 실패 시 RealtimeClientError로 전달함", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502
      })
    );

    const client = new RealtimeClient("http://localhost:4001", "internal-token");

    await expect(client.sendTelemetry(tick)).rejects.toMatchObject({
      code: "REQUEST_FAILED",
      status: 502
    });
  });

  it("500 non-ok 응답은 에러 타입과 상태 코드를 유지함", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      })
    );

    const client = new RealtimeClient("http://localhost:4001", "internal-token");

    try {
      await client.sendTelemetry(tick);
      expect.fail("실패가 필요함");
    } catch (error) {
      expect(error).toBeInstanceOf(RealtimeClientError);
      expect(error).toMatchObject({
        status: 500
      });
    }
  });

  it("timeout이 아닌 fetch/network 실패는 upstream 성격 상태로 매핑함", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed"))
    );

    const client = new RealtimeClient("http://localhost:4001", "internal-token");

    await expect(client.sendTelemetry(tick)).rejects.toMatchObject({
      code: "REQUEST_FAILED",
      status: 502
    });
  });

  it("내부 POST timeout 기본값은 3000ms를 사용함", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", createAbortableFetchMock());

    const client = new RealtimeClient("http://localhost:4001", "internal-token");
    const pending = client.sendTelemetry(tick);
    const assertion = expect(pending).rejects.toMatchObject({
      code: "REQUEST_FAILED",
      status: 504,
      message: "요청 처리 실패"
    });

    await vi.advanceTimersByTimeAsync(3000);
    await assertion;
  });

  it("내부 POST timeout override 값을 반영해 실패로 종료함", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", createAbortableFetchMock());

    const timeoutMs = 10;
    const client = new RealtimeClient("http://localhost:4001", "internal-token", timeoutMs);
    const pending = client.sendTelemetry(tick);
    const assertion = expect(pending).rejects.toMatchObject({
      code: "REQUEST_FAILED",
      status: 504,
      message: "요청 처리 실패"
    });

    await vi.advanceTimersByTimeAsync(timeoutMs);
    await assertion;
  });

  it("전송 실패 로그는 오타 없는 opaque 메시지만 남김", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      const client = new RealtimeClient("http://localhost:4001", "internal-token");
      client.handleFailure(new Error("secret-transport-detail"));
      expect(consoleErrorSpy).toHaveBeenCalledWith("워커 전송 실패", "요청 처리 실패");
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
