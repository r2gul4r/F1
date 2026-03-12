import { createServer } from "node:http";
import { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createWatchToken } from "@f1/shared/watch-token";
import { WebSocket } from "ws";
import { WsHub } from "../src/ws/hub.js";

const openServer = async (bufferSize: number) => {
  const server = createServer();
  const tokenSecret = "watch-token-secret-for-test-123456";
  const onConnected = vi.fn();
  const onRejected = vi.fn();
  const onReplayDelivered = vi.fn();
  const hub = new WsHub(server, {
    bufferSize,
    watchTokenSecret: tokenSecret,
    allowedOrigins: ["http://localhost:3000"],
    onConnected,
    onRejected,
    onReplayDelivered
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  return {
    hub,
    onConnected,
    onRejected,
    onReplayDelivered,
    tokenSecret,
    server,
    port: (server.address() as AddressInfo).port
  };
};

const closeServer = async (server: ReturnType<typeof createServer>): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
};

const connectAndCollectMessages = async (input: {
  port: number;
  sessionId: string;
  tokenSecret: string;
  expectedCount: number;
}): Promise<string[]> => {
  const token = createWatchToken(input.tokenSecret, 60);

  return new Promise<string[]>((resolve, reject) => {
    const messages: string[] = [];
    const socket = new WebSocket(
      `ws://127.0.0.1:${input.port}/ws?sessionId=${encodeURIComponent(input.sessionId)}&token=${encodeURIComponent(token)}`,
      {
        headers: {
          origin: "http://localhost:3000"
        }
      }
    );

    const timer = setTimeout(() => {
      socket.close();
      if (messages.length === input.expectedCount) {
        resolve(messages);
        return;
      }

      reject(new Error(`Expected ${input.expectedCount} messages but received ${messages.length}`));
    }, 200);

    socket.on("message", (message) => {
      messages.push(String(message));
      if (messages.length >= input.expectedCount) {
        clearTimeout(timer);
        socket.close();
        resolve(messages);
      }
    });

    socket.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
};

describe("ws hub", () => {
  const servers: Array<ReturnType<typeof createServer>> = [];

  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => closeServer(server)));
  });

  it("reconnect replay는 같은 session 이벤트만 전달함", async () => {
    const runtime = await openServer(10);
    servers.push(runtime.server);

    runtime.hub.broadcast({
      type: "telemetry.tick",
      payload: {
        sessionId: "session-1",
        driverId: "VER",
        position: { x: 1, y: 2, z: 0 },
        speedKph: 310,
        lap: 5,
        rank: 1,
        timestampMs: 1000
      }
    });
    runtime.hub.broadcast({
      type: "telemetry.tick",
      payload: {
        sessionId: "session-2",
        driverId: "NOR",
        position: { x: 3, y: 4, z: 0 },
        speedKph: 300,
        lap: 5,
        rank: 2,
        timestampMs: 1001
      }
    });

    const messages = await connectAndCollectMessages({
      port: runtime.port,
      sessionId: "session-1",
      tokenSecret: runtime.tokenSecret,
      expectedCount: 1
    });

    expect(runtime.onConnected).toHaveBeenCalledTimes(1);
    expect(runtime.onRejected).not.toHaveBeenCalled();
    expect(runtime.onReplayDelivered).toHaveBeenCalledTimes(1);
    expect(messages).toHaveLength(1);
    expect(JSON.parse(messages[0] ?? "{}")).toMatchObject({
      type: "telemetry.tick",
      payload: {
        sessionId: "session-1",
        driverId: "VER"
      }
    });
  });

  it("reconnect replay는 buffer capacity 안의 최신 이벤트만 유지함", async () => {
    const runtime = await openServer(2);
    servers.push(runtime.server);

    runtime.hub.broadcast({
      type: "telemetry.tick",
      payload: {
        sessionId: "session-1",
        driverId: "VER",
        position: { x: 1, y: 2, z: 0 },
        speedKph: 300,
        lap: 5,
        rank: 3,
        timestampMs: 1000
      }
    });
    runtime.hub.broadcast({
      type: "telemetry.tick",
      payload: {
        sessionId: "session-1",
        driverId: "VER",
        position: { x: 2, y: 3, z: 0 },
        speedKph: 305,
        lap: 5,
        rank: 2,
        timestampMs: 1001
      }
    });
    runtime.hub.broadcast({
      type: "telemetry.tick",
      payload: {
        sessionId: "session-1",
        driverId: "VER",
        position: { x: 3, y: 4, z: 0 },
        speedKph: 310,
        lap: 5,
        rank: 1,
        timestampMs: 1002
      }
    });

    const messages = await connectAndCollectMessages({
      port: runtime.port,
      sessionId: "session-1",
      tokenSecret: runtime.tokenSecret,
      expectedCount: 2
    });

    const parsed = messages.map((message) => JSON.parse(message));
    expect(runtime.onReplayDelivered).toHaveBeenCalledTimes(2);
    expect(parsed.map((item) => item.payload.timestampMs)).toEqual([1001, 1002]);
  });

  it("인증 실패 websocket은 reject callback을 호출함", async () => {
    const runtime = await openServer(10);
    servers.push(runtime.server);

    await new Promise<void>((resolve) => {
      const socket = new WebSocket(`ws://127.0.0.1:${runtime.port}/ws?sessionId=session-1&token=invalid-token`, {
        headers: {
          origin: "http://localhost:3000"
        }
      });

      socket.on("close", () => resolve());
    });

    expect(runtime.onConnected).not.toHaveBeenCalled();
    expect(runtime.onRejected).toHaveBeenCalledTimes(1);
  });
});
