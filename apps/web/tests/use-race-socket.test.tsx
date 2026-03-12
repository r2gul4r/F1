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
});
