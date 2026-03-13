import { describe, expect, it, vi } from "vitest";
import { runMainLoopCycle } from "../src/main-loop-cycle.js";
import { type Snapshot, type TelemetrySource } from "../src/sources/types.js";

type MainLoopClient = {
  syncSession: ReturnType<typeof vi.fn>;
  sendTelemetry: ReturnType<typeof vi.fn>;
  sendFlag: ReturnType<typeof vi.fn>;
  handleFailure: ReturnType<typeof vi.fn>;
};

const baseSnapshot: Snapshot = {
  session: {
    id: "session-1",
    name: "Bahrain GP",
    startsAt: "2026-03-12T00:00:00.000Z",
    isCurrent: true
  },
  drivers: [
    {
      id: "VER",
      sessionId: "session-1",
      fullName: "Max Verstappen",
      number: 1,
      teamName: "Red Bull",
      deepLink: "https://f1tv.formula1.com"
    }
  ],
  ticks: [
    {
      sessionId: "session-1",
      driverId: "VER",
      position: { x: 1, y: 2, z: 3 },
      speedKph: 320,
      lap: 5,
      rank: 1,
      timestampMs: 1710288000000
    }
  ]
};

const createSource = (pull: TelemetrySource["pull"]): TelemetrySource => ({ pull });

const createClient = (): MainLoopClient => ({
  syncSession: vi.fn().mockResolvedValue(undefined),
  sendTelemetry: vi.fn().mockResolvedValue(undefined),
  sendFlag: vi.fn().mockResolvedValue(undefined),
  handleFailure: vi.fn()
});

describe("main loop cycle helper", () => {
  it("OpenF1 실패 후 mock fallback 성공이면 degraded를 반환함", async () => {
    const source = createSource(vi.fn().mockRejectedValue(new Error("openf1 unavailable")));
    const mockSource = createSource(vi.fn().mockResolvedValue(baseSnapshot));
    const client = createClient();

    const outcome = await runMainLoopCycle({
      source,
      mockSource,
      client,
      allowMockFallback: true
    });

    expect(outcome).toBe("degraded");
    expect(client.syncSession).toHaveBeenCalledWith(baseSnapshot.session, baseSnapshot.drivers);
    expect(client.sendTelemetry).toHaveBeenCalledTimes(baseSnapshot.ticks.length);
    expect(client.handleFailure).not.toHaveBeenCalled();
  });

  it("원본 source 성공이면 primary_success를 반환함", async () => {
    const source = createSource(vi.fn().mockResolvedValue(baseSnapshot));
    const mockSource = createSource(vi.fn().mockResolvedValue(baseSnapshot));
    const client = createClient();

    const outcome = await runMainLoopCycle({
      source,
      mockSource,
      client,
      allowMockFallback: true
    });

    expect(outcome).toBe("primary_success");
    expect(mockSource.pull).not.toHaveBeenCalled();
    expect(client.handleFailure).not.toHaveBeenCalled();
  });

  it("fallback까지 실패하면 failure를 반환하고 원본 실패 맥락을 보존함", async () => {
    const primaryError = new Error("openf1 unavailable");
    const fallbackError = new Error("mock source unavailable");
    const source = createSource(vi.fn().mockRejectedValue(primaryError));
    const mockSource = createSource(vi.fn().mockRejectedValue(fallbackError));
    const client = createClient();

    const outcome = await runMainLoopCycle({
      source,
      mockSource,
      client,
      allowMockFallback: true
    });

    expect(outcome).toBe("failure");
    expect(client.handleFailure).toHaveBeenCalledTimes(1);

    const [reportedError] = client.handleFailure.mock.calls[0] as [unknown];
    expect(reportedError).toBeInstanceOf(AggregateError);

    if (reportedError instanceof AggregateError) {
      expect(reportedError.errors).toContain(primaryError);
      expect(reportedError.errors).toContain(fallbackError);
    }
  });

  it("fallback 비활성화 상태에서 원본 source 실패면 failure를 반환함", async () => {
    const primaryError = new Error("mock source failed");
    const source = createSource(vi.fn().mockRejectedValue(primaryError));
    const mockSource = createSource(vi.fn().mockResolvedValue(baseSnapshot));
    const client = createClient();

    const outcome = await runMainLoopCycle({
      source,
      mockSource,
      client,
      allowMockFallback: false
    });

    expect(outcome).toBe("failure");
    expect(mockSource.pull).not.toHaveBeenCalled();
    expect(client.handleFailure).toHaveBeenCalledWith(primaryError);
  });
});
