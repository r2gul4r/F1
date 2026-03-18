import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRaceSocket } from "../src/lib/use-race-socket";
import { useRaceStore } from "../src/store/use-race-store";

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static OPEN = 1;
  static CLOSED = 3;

  readonly url: string;
  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
    queueMicrotask(() => {
      this.readyState = FakeWebSocket.OPEN;
      this.onopen?.({} as Event);
    });
  }

  close(): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({} as CloseEvent);
  }
}

const Probe = ({ sessionId }: { sessionId: string }) => {
  const { status } = useRaceSocket(sessionId, "watch-token");
  return <div data-testid="status">{status}</div>;
};

const flushAsync = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe("useRaceSocket", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    useRaceStore.setState({
      drivers: [],
      ticksByDriver: {},
      selectedDriverId: null,
      flag: null,
      predictions: [],
      fps: 0
    });
    vi.stubGlobal("WebSocket", FakeWebSocket);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("current session 조회 실패 후 재시도에 성공하면 실제 session으로 연결함", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 503 })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "session-2",
            name: "Saudi GP",
            startsAt: "2026-03-12T00:00:00.000Z",
            isCurrent: true
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => []
        })
    );

    render(<Probe sessionId="current" />);

    await flushAsync();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    await flushAsync();
    await flushAsync();

    expect(FakeWebSocket.instances[0]?.url).toContain("sessionId=session-2");
    expect(FakeWebSocket.instances[0]?.url).not.toContain("mock-session");
    expect(screen.getByTestId("status").textContent).toBe("connected");
  });

  it("current session reconnect 시 현재 session을 다시 조회함", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "session-1",
            name: "Bahrain GP",
            startsAt: "2026-03-12T00:00:00.000Z",
            isCurrent: true
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => []
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "session-2",
            name: "Saudi GP",
            startsAt: "2026-03-13T00:00:00.000Z",
            isCurrent: true
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => []
        })
    );

    render(<Probe sessionId="current" />);

    await flushAsync();
    await flushAsync();
    expect(FakeWebSocket.instances[0]?.url).toContain("sessionId=session-1");

    FakeWebSocket.instances[0]?.close();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    await flushAsync();
    await flushAsync();

    expect(FakeWebSocket.instances[1]?.url).toContain("sessionId=session-2");
  });

  it("current session 경계가 바뀌면 이전 session live 상태를 비움", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "session-1",
            name: "Bahrain GP",
            startsAt: "2026-03-12T00:00:00.000Z",
            isCurrent: true
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: "VER",
              sessionId: "session-1",
              fullName: "Max Verstappen",
              number: 1,
              teamName: "Red Bull",
              deepLink: "https://f1tv.formula1.com"
            }
          ]
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "session-2",
            name: "Saudi GP",
            startsAt: "2026-03-13T00:00:00.000Z",
            isCurrent: true
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: "NOR",
              sessionId: "session-2",
              fullName: "Lando Norris",
              number: 4,
              teamName: "McLaren",
              deepLink: "https://www.formula1.com/en/drivers/lando-norris"
            }
          ]
        })
    );

    render(<Probe sessionId="current" />);

    await flushAsync();
    await flushAsync();

    act(() => {
      useRaceStore.setState({
        ticksByDriver: {
          VER: {
            sessionId: "session-1",
            driverId: "VER",
            position: { x: 1, y: 2, z: 0 },
            speedKph: 320,
            lap: 9,
            rank: 1,
            timestampMs: 1000
          }
        },
        selectedDriverId: "VER",
        flag: {
          sessionId: "session-1",
          flagType: "YELLOW",
          timestampMs: 1000
        },
        predictions: [
          {
            sessionId: "session-1",
            lap: 9,
            triggerDriverId: "VER",
            podiumProb: [0.6, 0.3, 0.1],
            isFallback: false,
            reasoningSummary: "old session",
            modelLatencyMs: 100,
            timestampMs: 1000
          }
        ]
      });
    });

    FakeWebSocket.instances[0]?.close();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    await flushAsync();
    await flushAsync();

    const next = useRaceStore.getState();
    expect(FakeWebSocket.instances[1]?.url).toContain("sessionId=session-2");
    expect(next.drivers).toMatchObject([{ id: "NOR", sessionId: "session-2" }]);
    expect(next.ticksByDriver).toEqual({});
    expect(next.predictions).toEqual([]);
    expect(next.flag).toBeNull();
    expect(next.selectedDriverId).toBeNull();
  });

  it("새 session 드라이버 조회가 한 번 실패해도 stale 드라이버를 유지하지 않음", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "session-1",
            name: "Bahrain GP",
            startsAt: "2026-03-12T00:00:00.000Z",
            isCurrent: true
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: "VER",
              sessionId: "session-1",
              fullName: "Max Verstappen",
              number: 1,
              teamName: "Red Bull",
              deepLink: "https://f1tv.formula1.com"
            }
          ]
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "session-2",
            name: "Saudi GP",
            startsAt: "2026-03-13T00:00:00.000Z",
            isCurrent: true
          })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "session-2",
            name: "Saudi GP",
            startsAt: "2026-03-13T00:00:00.000Z",
            isCurrent: true
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: "NOR",
              sessionId: "session-2",
              fullName: "Lando Norris",
              number: 4,
              teamName: "McLaren",
              deepLink: "https://www.formula1.com/en/drivers/lando-norris"
            }
          ]
        })
    );

    render(<Probe sessionId="current" />);

    await flushAsync();
    await flushAsync();

    act(() => {
      useRaceStore.setState({
        ticksByDriver: {
          VER: {
            sessionId: "session-1",
            driverId: "VER",
            position: { x: 1, y: 2, z: 0 },
            speedKph: 320,
            lap: 9,
            rank: 1,
            timestampMs: 1000
          }
        },
        selectedDriverId: "VER",
        predictions: [
          {
            sessionId: "session-1",
            lap: 9,
            triggerDriverId: "VER",
            podiumProb: [0.6, 0.3, 0.1],
            isFallback: false,
            reasoningSummary: "old session",
            modelLatencyMs: 100,
            timestampMs: 1000
          }
        ]
      });
    });

    FakeWebSocket.instances[0]?.close();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await flushAsync();
    await flushAsync();

    const failedBoundary = useRaceStore.getState();
    expect(failedBoundary.drivers).toEqual([]);
    expect(failedBoundary.ticksByDriver).toEqual({});
    expect(failedBoundary.predictions).toEqual([]);
    expect(failedBoundary.selectedDriverId).toBeNull();
    expect(screen.getByTestId("status").textContent).toBe("reconnecting");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    await flushAsync();
    await flushAsync();

    const recovered = useRaceStore.getState();
    expect(FakeWebSocket.instances[1]?.url).toContain("sessionId=session-2");
    expect(recovered.drivers).toMatchObject([{ id: "NOR", sessionId: "session-2" }]);
  });

  it("current session이 null로 떨어지면 기존 live 상태를 비우고 재시도함", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "session-1",
            name: "Bahrain GP",
            startsAt: "2026-03-12T00:00:00.000Z",
            isCurrent: true
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: "VER",
              sessionId: "session-1",
              fullName: "Max Verstappen",
              number: 1,
              teamName: "Red Bull",
              deepLink: "https://f1tv.formula1.com"
            }
          ]
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => null
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "session-2",
            name: "Saudi GP",
            startsAt: "2026-03-13T00:00:00.000Z",
            isCurrent: true
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: "NOR",
              sessionId: "session-2",
              fullName: "Lando Norris",
              number: 4,
              teamName: "McLaren",
              deepLink: "https://www.formula1.com/en/drivers/lando-norris"
            }
          ]
        })
    );

    render(<Probe sessionId="current" />);

    await flushAsync();
    await flushAsync();

    act(() => {
      useRaceStore.setState({
        ticksByDriver: {
          VER: {
            sessionId: "session-1",
            driverId: "VER",
            position: { x: 1, y: 2, z: 0 },
            speedKph: 320,
            lap: 9,
            rank: 1,
            timestampMs: 1000
          }
        },
        selectedDriverId: "VER",
        predictions: [
          {
            sessionId: "session-1",
            lap: 9,
            triggerDriverId: "VER",
            podiumProb: [0.6, 0.3, 0.1],
            isFallback: false,
            reasoningSummary: "old session",
            modelLatencyMs: 100,
            timestampMs: 1000
          }
        ]
      });
    });

    FakeWebSocket.instances[0]?.close();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await flushAsync();

    const nullBoundary = useRaceStore.getState();
    expect(nullBoundary.drivers).toEqual([]);
    expect(nullBoundary.ticksByDriver).toEqual({});
    expect(nullBoundary.predictions).toEqual([]);
    expect(nullBoundary.selectedDriverId).toBeNull();
    expect(screen.getByTestId("status").textContent).toBe("reconnecting");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    await flushAsync();
    await flushAsync();

    expect(FakeWebSocket.instances[1]?.url).toContain("sessionId=session-2");
    expect(useRaceStore.getState().drivers).toMatchObject([{ id: "NOR", sessionId: "session-2" }]);
  });

  it("재연결 중에도 같은 websocket clientId를 유지함", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => []
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => []
        })
    );

    render(<Probe sessionId="session-1" />);

    await flushAsync();
    await flushAsync();
    const firstUrl = new URL(FakeWebSocket.instances[0]?.url ?? "ws://localhost");
    const firstClientId = firstUrl.searchParams.get("clientId");

    FakeWebSocket.instances[0]?.close();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    await flushAsync();
    await flushAsync();
    const secondUrl = new URL(FakeWebSocket.instances[1]?.url ?? "ws://localhost");
    const secondClientId = secondUrl.searchParams.get("clientId");

    expect(firstClientId).toBeTruthy();
    expect(secondClientId).toBe(firstClientId);
  });

  it("current session이 null이면 재시도 후 연결함", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => null
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "session-3",
            name: "Australia GP",
            startsAt: "2026-03-14T00:00:00.000Z",
            isCurrent: true
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => []
        })
    );

    render(<Probe sessionId="current" />);

    await flushAsync();
    expect(FakeWebSocket.instances).toHaveLength(0);
    expect(screen.getByTestId("status").textContent).toBe("reconnecting");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    await flushAsync();
    await flushAsync();

    expect(FakeWebSocket.instances[0]?.url).toContain("sessionId=session-3");
    expect(screen.getByTestId("status").textContent).toBe("connected");
  });
});
