import { afterEach, describe, expect, it, vi } from "vitest";
import { RealtimeClient, RealtimeClientError } from "../src/realtime-client.js";

const tick = {
  sessionId: "session-1",
  driverId: "VER",
  position: { x: 1, y: 2, z: 3 },
  speedKph: 320,
  lap: 5,
  rank: 1,
  timestampMs: Date.now()
};

describe("realtime client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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

  it("에러 타입을 유지함", async () => {
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
    }
  });
});
