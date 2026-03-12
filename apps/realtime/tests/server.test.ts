import { authSessionResponseSchema } from "@f1/shared";
import { createWatchToken, verifyWatchToken } from "@f1/shared/watch-token";
import { AddressInfo } from "node:net";
import { WebSocket } from "ws";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildServer } from "../src/server.js";
import { MemoryRepository } from "../src/store/memory-repository.js";

describe("realtime api", () => {
  const internalApiToken = "internal-token-for-test-123456";
  const oauthProxyToken = "oauth-proxy-token-for-test-123456";
  const watchTokenSecret = "watch-token-secret-for-test-123456";
  const watchToken = createWatchToken(watchTokenSecret, 60 * 60);
  const oauthUserRepository = {
    upsertIdentity: async (input: {
      provider: string;
      providerUserId: string;
      displayName: string;
      email?: string;
      avatarUrl?: string;
    }) => ({
      userId: `${input.provider}-${input.providerUserId}`,
      provider: input.provider,
      providerUserId: input.providerUserId,
      displayName: input.displayName,
      email: input.email ?? null,
      avatarUrl: input.avatarUrl ?? null
    })
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("세션과 드라이버 조회 API가 동작함", async () => {
    const repository = new MemoryRepository();
    await repository.upsertSession({
      id: "session-1",
      name: "Bahrain GP",
      startsAt: new Date().toISOString(),
      isCurrent: true
    });
    await repository.upsertDrivers([
      {
        id: "VER",
        sessionId: "session-1",
        fullName: "Max Verstappen",
        number: 1,
        teamName: "Red Bull",
        deepLink: "https://f1tv.formula1.com"
      }
    ]);

    const { app } = await buildServer({
      repository,
      oauthUserRepository,
      internalApiToken,
      oauthProxyToken,
      watchTokenSecret,
      watchTokenTtlSec: 3600,
      allowedOrigins: ["http://localhost:3000"],
      wsBufferSize: 100,
      ollamaBaseUrl: "http://localhost:11434",
      ollamaModel: "gemma3:12b"
    });

    const current = await app.inject({
      method: "GET",
      url: "/api/v1/sessions/current",
      headers: {
        "x-watch-token": watchToken
      }
    });
    expect(current.statusCode).toBe(200);

    const drivers = await app.inject({
      method: "GET",
      url: "/api/v1/sessions/session-1/drivers",
      headers: {
        "x-watch-token": watchToken
      }
    });
    expect(drivers.statusCode).toBe(200);
    expect(drivers.json()).toHaveLength(1);
  });

  it("내부 session sync API로 저장한 세션과 드라이버를 public read API로 다시 읽음", async () => {
    const repository = new MemoryRepository();
    const { app } = await buildServer({
      repository,
      oauthUserRepository,
      internalApiToken,
      oauthProxyToken,
      watchTokenSecret,
      watchTokenTtlSec: 3600,
      allowedOrigins: ["http://localhost:3000"],
      wsBufferSize: 100,
      ollamaBaseUrl: "http://localhost:11434",
      ollamaModel: "gemma3:12b"
    });

    const sync = await app.inject({
      method: "POST",
      url: "/internal/session",
      headers: {
        "x-internal-token": internalApiToken
      },
      payload: {
        session: {
          id: "session-2",
          name: "Saudi Arabia GP",
          startsAt: new Date().toISOString(),
          isCurrent: true
        },
        drivers: [
          {
            id: "NOR",
            sessionId: "session-2",
            fullName: "Lando Norris",
            number: 4,
            teamName: "McLaren",
            deepLink: "https://f1tv.formula1.com"
          }
        ]
      }
    });

    expect(sync.statusCode).toBe(200);

    const current = await app.inject({
      method: "GET",
      url: "/api/v1/sessions/current",
      headers: {
        "x-watch-token": watchToken
      }
    });
    expect(current.statusCode).toBe(200);
    expect(current.json()).toMatchObject({
      id: "session-2",
      name: "Saudi Arabia GP"
    });

    const drivers = await app.inject({
      method: "GET",
      url: "/api/v1/sessions/session-2/drivers",
      headers: {
        "x-watch-token": watchToken
      }
    });
    expect(drivers.statusCode).toBe(200);
    expect(drivers.json()).toMatchObject([
      {
        id: "NOR",
        sessionId: "session-2"
      }
    ]);
  });

  it("내부 session sync API는 잘못된 drivers payload를 거부함", async () => {
    const repository = new MemoryRepository();
    const { app } = await buildServer({
      repository,
      oauthUserRepository,
      internalApiToken,
      oauthProxyToken,
      watchTokenSecret,
      watchTokenTtlSec: 3600,
      allowedOrigins: ["http://localhost:3000"],
      wsBufferSize: 100,
      ollamaBaseUrl: "http://localhost:11434",
      ollamaModel: "gemma3:12b"
    });

    const response = await app.inject({
      method: "POST",
      url: "/internal/session",
      headers: {
        "x-internal-token": internalApiToken
      },
      payload: {
        session: {
          id: "session-3",
          name: "Australia GP",
          startsAt: new Date().toISOString(),
          isCurrent: true
        },
        drivers: {
          id: "PIA"
        }
      }
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      message: "요청 처리 실패"
    });
  });

  it("watch 토큰이 없으면 조회 API를 거부함", async () => {
    const repository = new MemoryRepository();
    const { app } = await buildServer({
      repository,
      oauthUserRepository,
      internalApiToken,
      oauthProxyToken,
      watchTokenSecret,
      watchTokenTtlSec: 3600,
      allowedOrigins: ["http://localhost:3000"],
      wsBufferSize: 100,
      ollamaBaseUrl: "http://localhost:11434",
      ollamaModel: "gemma3:12b"
    });

    const current = await app.inject({ method: "GET", url: "/api/v1/sessions/current" });
    expect(current.statusCode).toBe(403);
  });

  it("내부 토큰이 없으면 ai 예측을 거부함", async () => {
    const repository = new MemoryRepository();
    const { app } = await buildServer({
      repository,
      oauthUserRepository,
      internalApiToken,
      oauthProxyToken,
      watchTokenSecret,
      watchTokenTtlSec: 3600,
      allowedOrigins: ["http://localhost:3000"],
      wsBufferSize: 100,
      ollamaBaseUrl: "http://localhost:11434",
      ollamaModel: "gemma3:12b"
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/ai/predict",
      payload: {
        sessionId: "s1",
        lap: 3,
        triggerDriverId: "NOR",
        snapshot: { ticks: [] }
      }
    });

    expect(response.statusCode).toBe(403);
  });

  it("metrics는 내부 토큰 없으면 거부함", async () => {
    const repository = new MemoryRepository();
    const { app } = await buildServer({
      repository,
      oauthUserRepository,
      internalApiToken,
      oauthProxyToken,
      watchTokenSecret,
      watchTokenTtlSec: 3600,
      allowedOrigins: ["http://localhost:3000"],
      wsBufferSize: 100,
      ollamaBaseUrl: "http://localhost:11434",
      ollamaModel: "gemma3:12b"
    });

    const denied = await app.inject({ method: "GET", url: "/metrics" });
    expect(denied.statusCode).toBe(403);

    const allowed = await app.inject({
      method: "GET",
      url: "/metrics",
      headers: {
        "x-internal-token": internalApiToken
      }
    });
    expect(allowed.statusCode).toBe(200);
  });

  it("metrics는 internal session sync count를 노출함", async () => {
    const repository = new MemoryRepository();
    const { app } = await buildServer({
      repository,
      oauthUserRepository,
      internalApiToken,
      oauthProxyToken,
      watchTokenSecret,
      watchTokenTtlSec: 3600,
      allowedOrigins: ["http://localhost:3000"],
      wsBufferSize: 100,
      ollamaBaseUrl: "http://localhost:11434",
      ollamaModel: "gemma3:12b"
    });

    const sync = await app.inject({
      method: "POST",
      url: "/internal/session",
      headers: {
        "x-internal-token": internalApiToken
      },
      payload: {
        session: {
          id: "session-metrics",
          name: "Metrics GP",
          startsAt: new Date().toISOString(),
          isCurrent: true
        },
        drivers: []
      }
    });
    expect(sync.statusCode).toBe(200);

    const metrics = await app.inject({
      method: "GET",
      url: "/metrics",
      headers: {
        "x-internal-token": internalApiToken
      }
    });

    expect(metrics.statusCode).toBe(200);
    expect(metrics.body).toContain("session_sync_count 1");
  });

  it("metrics는 websocket connection과 reject count를 노출함", async () => {
    const repository = new MemoryRepository();
    const { app } = await buildServer({
      repository,
      oauthUserRepository,
      internalApiToken,
      oauthProxyToken,
      watchTokenSecret,
      watchTokenTtlSec: 3600,
      allowedOrigins: ["http://localhost:3000"],
      wsBufferSize: 100,
      ollamaBaseUrl: "http://localhost:11434",
      ollamaModel: "gemma3:12b"
    });

    await app.listen({
      port: 0,
      host: "127.0.0.1"
    });

    try {
      const port = (app.server.address() as AddressInfo).port;
      const validToken = createWatchToken(watchTokenSecret, 60);

      await new Promise<void>((resolve) => {
        const socket = new WebSocket(`ws://127.0.0.1:${port}/ws?sessionId=session-1&token=${validToken}`, {
          headers: {
            origin: "http://localhost:3000"
          }
        });

        socket.on("open", () => {
          socket.close();
          resolve();
        });
      });

      await new Promise<void>((resolve) => {
        const socket = new WebSocket(`ws://127.0.0.1:${port}/ws?sessionId=session-1&token=invalid-token`, {
          headers: {
            origin: "http://localhost:3000"
          }
        });

        socket.on("close", () => resolve());
      });

      const metricsResponse = await fetch(`http://127.0.0.1:${port}/metrics`, {
        headers: {
          "x-internal-token": internalApiToken
        }
      });
      const metricsBody = await metricsResponse.text();

      expect(metricsResponse.status).toBe(200);
      expect(metricsBody).toContain("ws_connection_count 1");
      expect(metricsBody).toContain("ws_reject_count 1");
    } finally {
      await app.close();
    }
  });

  it("metrics는 websocket replay delivery count를 노출함", async () => {
    const repository = new MemoryRepository();
    const { app } = await buildServer({
      repository,
      oauthUserRepository,
      internalApiToken,
      oauthProxyToken,
      watchTokenSecret,
      watchTokenTtlSec: 3600,
      allowedOrigins: ["http://localhost:3000"],
      wsBufferSize: 100,
      ollamaBaseUrl: "http://localhost:11434",
      ollamaModel: "gemma3:12b"
    });

    await app.listen({
      port: 0,
      host: "127.0.0.1"
    });

    try {
      const port = (app.server.address() as AddressInfo).port;
      const validToken = createWatchToken(watchTokenSecret, 60);

      await app.inject({
        method: "POST",
        url: "/internal/events/telemetry",
        headers: {
          "x-internal-token": internalApiToken
        },
        payload: {
          sessionId: "session-replay",
          driverId: "VER",
          position: { x: 1, y: 2, z: 0 },
          speedKph: 312,
          lap: 8,
          rank: 1,
          timestampMs: 1000
        }
      });

      await new Promise<void>((resolve) => {
        const socket = new WebSocket(`ws://127.0.0.1:${port}/ws?sessionId=session-replay&token=${validToken}`, {
          headers: {
            origin: "http://localhost:3000"
          }
        });

        socket.on("message", () => {
          socket.close();
          resolve();
        });
      });

      const metricsResponse = await fetch(`http://127.0.0.1:${port}/metrics`, {
        headers: {
          "x-internal-token": internalApiToken
        }
      });
      const metricsBody = await metricsResponse.text();

      expect(metricsResponse.status).toBe(200);
      expect(metricsBody).toContain("ws_replay_delivery_count 1");
    } finally {
      await app.close();
    }
  });

  it("metrics는 같은 session 재연결 count를 노출함", async () => {
    const repository = new MemoryRepository();
    const { app } = await buildServer({
      repository,
      oauthUserRepository,
      internalApiToken,
      oauthProxyToken,
      watchTokenSecret,
      watchTokenTtlSec: 3600,
      allowedOrigins: ["http://localhost:3000"],
      wsBufferSize: 100,
      ollamaBaseUrl: "http://localhost:11434",
      ollamaModel: "gemma3:12b"
    });

    await app.listen({
      port: 0,
      host: "127.0.0.1"
    });

    try {
      const port = (app.server.address() as AddressInfo).port;
      const validToken = createWatchToken(watchTokenSecret, 60);
      const clientId = "client-reconnect-1";

      await new Promise<void>((resolve) => {
        const socket = new WebSocket(
          `ws://127.0.0.1:${port}/ws?sessionId=session-reconnect&token=${validToken}&clientId=${clientId}`,
          {
            headers: {
              origin: "http://localhost:3000"
            }
          }
        );

        socket.on("open", () => {
          socket.close();
        });

        socket.on("close", () => resolve());
      });

      await new Promise<void>((resolve) => {
        const socket = new WebSocket(
          `ws://127.0.0.1:${port}/ws?sessionId=session-reconnect&token=${validToken}&clientId=${clientId}`,
          {
            headers: {
              origin: "http://localhost:3000"
            }
          }
        );

        socket.on("open", () => {
          socket.close();
        });

        socket.on("close", () => resolve());
      });

      const metricsResponse = await fetch(`http://127.0.0.1:${port}/metrics`, {
        headers: {
          "x-internal-token": internalApiToken
        }
      });
      const metricsBody = await metricsResponse.text();

      expect(metricsResponse.status).toBe(200);
      expect(metricsBody).toContain("ws_reconnect_count 1");
    } finally {
      await app.close();
    }
  });

  it("metrics는 다른 client의 같은 session 첫 연결을 reconnect로 세지 않음", async () => {
    const repository = new MemoryRepository();
    const { app } = await buildServer({
      repository,
      oauthUserRepository,
      internalApiToken,
      oauthProxyToken,
      watchTokenSecret,
      watchTokenTtlSec: 3600,
      allowedOrigins: ["http://localhost:3000"],
      wsBufferSize: 100,
      ollamaBaseUrl: "http://localhost:11434",
      ollamaModel: "gemma3:12b"
    });

    await app.listen({
      port: 0,
      host: "127.0.0.1"
    });

    try {
      const port = (app.server.address() as AddressInfo).port;
      const validToken = createWatchToken(watchTokenSecret, 60);

      await new Promise<void>((resolve) => {
        const socket = new WebSocket(
          `ws://127.0.0.1:${port}/ws?sessionId=session-reconnect&token=${validToken}&clientId=client-a`,
          {
            headers: {
              origin: "http://localhost:3000"
            }
          }
        );

        socket.on("open", () => {
          socket.close();
        });

        socket.on("close", () => resolve());
      });

      await new Promise<void>((resolve) => {
        const socket = new WebSocket(
          `ws://127.0.0.1:${port}/ws?sessionId=session-reconnect&token=${validToken}&clientId=client-b`,
          {
            headers: {
              origin: "http://localhost:3000"
            }
          }
        );

        socket.on("open", () => {
          socket.close();
        });

        socket.on("close", () => resolve());
      });

      const metricsResponse = await fetch(`http://127.0.0.1:${port}/metrics`, {
        headers: {
          "x-internal-token": internalApiToken
        }
      });
      const metricsBody = await metricsResponse.text();

      expect(metricsResponse.status).toBe(200);
      expect(metricsBody).toContain("ws_reconnect_count 0");
    } finally {
      await app.close();
    }
  });

  it("metrics는 websocket buffer overflow를 dropped-event suspicion으로 노출함", async () => {
    const repository = new MemoryRepository();
    const { app } = await buildServer({
      repository,
      oauthUserRepository,
      internalApiToken,
      oauthProxyToken,
      watchTokenSecret,
      watchTokenTtlSec: 3600,
      allowedOrigins: ["http://localhost:3000"],
      wsBufferSize: 1,
      ollamaBaseUrl: "http://localhost:11434",
      ollamaModel: "gemma3:12b"
    });

    const firstTick = await app.inject({
      method: "POST",
      url: "/internal/events/telemetry",
      headers: {
        "x-internal-token": internalApiToken
      },
      payload: {
        sessionId: "session-overflow",
        driverId: "VER",
        position: { x: 1, y: 2, z: 0 },
        speedKph: 312,
        lap: 8,
        rank: 1,
        timestampMs: 1000
      }
    });
    expect(firstTick.statusCode).toBe(202);

    const secondTick = await app.inject({
      method: "POST",
      url: "/internal/events/telemetry",
      headers: {
        "x-internal-token": internalApiToken
      },
      payload: {
        sessionId: "session-overflow",
        driverId: "VER",
        position: { x: 2, y: 3, z: 0 },
        speedKph: 314,
        lap: 8,
        rank: 1,
        timestampMs: 1100
      }
    });
    expect(secondTick.statusCode).toBe(202);

    const metrics = await app.inject({
      method: "GET",
      url: "/metrics",
      headers: {
        "x-internal-token": internalApiToken
      }
    });

    expect(metrics.statusCode).toBe(200);
    expect(metrics.body).toContain("ws_dropped_event_suspect_count 1");
  });

  it("metrics는 ai fallback inference를 별도 status로 노출함", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({})
      })
    );

    const repository = new MemoryRepository();
    const { app } = await buildServer({
      repository,
      oauthUserRepository,
      internalApiToken,
      oauthProxyToken,
      watchTokenSecret,
      watchTokenTtlSec: 3600,
      allowedOrigins: ["http://localhost:3000"],
      wsBufferSize: 100,
      ollamaBaseUrl: "http://localhost:11434",
      ollamaModel: "gemma3:12b"
    });

    const predict = await app.inject({
      method: "POST",
      url: "/api/v1/ai/predict",
      headers: {
        "x-internal-token": internalApiToken
      },
      payload: {
        sessionId: "session-fallback",
        lap: 4,
        triggerDriverId: "NOR",
        snapshot: {
          ticks: []
        }
      }
    });
    expect(predict.statusCode).toBe(200);

    const metrics = await app.inject({
      method: "GET",
      url: "/metrics",
      headers: {
        "x-internal-token": internalApiToken
      }
    });

    expect(metrics.statusCode).toBe(200);
    expect(metrics.body).toContain("ai_inference_ms_count{status=\"fallback\",provider=\"ollama\"} 1");
    expect(metrics.body).toContain("ai_fallback_count{reason=\"http_error\",provider=\"ollama\"} 1");
  });

  it("metrics는 telemetry trigger 경로의 ai fallback inference에 provider 라벨을 포함함", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({})
      })
    );

    const repository = new MemoryRepository();
    const { app } = await buildServer({
      repository,
      oauthUserRepository,
      internalApiToken,
      oauthProxyToken,
      watchTokenSecret,
      watchTokenTtlSec: 3600,
      allowedOrigins: ["http://localhost:3000"],
      wsBufferSize: 100,
      ollamaBaseUrl: "http://localhost:11434",
      ollamaModel: "gemma3:12b"
    });

    const firstTick = await app.inject({
      method: "POST",
      url: "/internal/events/telemetry",
      headers: {
        "x-internal-token": internalApiToken
      },
      payload: {
        sessionId: "session-trigger-metrics",
        driverId: "NOR",
        position: { x: 1, y: 2, z: 0 },
        speedKph: 312,
        lap: 8,
        rank: 6,
        timestampMs: 1000
      }
    });
    expect(firstTick.statusCode).toBe(202);

    const triggerTick = await app.inject({
      method: "POST",
      url: "/internal/events/telemetry",
      headers: {
        "x-internal-token": internalApiToken
      },
      payload: {
        sessionId: "session-trigger-metrics",
        driverId: "NOR",
        position: { x: 2, y: 3, z: 0 },
        speedKph: 314,
        lap: 8,
        rank: 5,
        timestampMs: 1100
      }
    });
    expect(triggerTick.statusCode).toBe(202);

    const metrics = await app.inject({
      method: "GET",
      url: "/metrics",
      headers: {
        "x-internal-token": internalApiToken
      }
    });

    expect(metrics.statusCode).toBe(200);
    expect(metrics.body).toContain("ai_inference_ms_count{status=\"fallback\",provider=\"ollama\"} 1");
    expect(metrics.body).toContain("ai_fallback_count{reason=\"http_error\",provider=\"ollama\"} 1");
  });

  it("telemetry trigger의 disabled provider는 fetch 없이 fallback metrics를 기록함", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const repository = new MemoryRepository();
    const { app } = await buildServer({
      repository,
      oauthUserRepository,
      internalApiToken,
      oauthProxyToken,
      watchTokenSecret,
      watchTokenTtlSec: 3600,
      allowedOrigins: ["http://localhost:3000"],
      wsBufferSize: 100,
      aiProvider: "disabled",
      ollamaBaseUrl: "http://localhost:11434",
      ollamaModel: "gemma3:12b"
    });

    const firstTick = await app.inject({
      method: "POST",
      url: "/internal/events/telemetry",
      headers: {
        "x-internal-token": internalApiToken
      },
      payload: {
        sessionId: "session-trigger-disabled",
        driverId: "NOR",
        position: { x: 1, y: 2, z: 0 },
        speedKph: 312,
        lap: 8,
        rank: 6,
        timestampMs: 1000
      }
    });
    expect(firstTick.statusCode).toBe(202);

    const triggerTick = await app.inject({
      method: "POST",
      url: "/internal/events/telemetry",
      headers: {
        "x-internal-token": internalApiToken
      },
      payload: {
        sessionId: "session-trigger-disabled",
        driverId: "NOR",
        position: { x: 2, y: 3, z: 0 },
        speedKph: 314,
        lap: 8,
        rank: 5,
        timestampMs: 1100
      }
    });
    expect(triggerTick.statusCode).toBe(202);
    expect(fetchMock).not.toHaveBeenCalled();

    const metrics = await app.inject({
      method: "GET",
      url: "/metrics",
      headers: {
        "x-internal-token": internalApiToken
      }
    });

    expect(metrics.statusCode).toBe(200);
    expect(metrics.body).toContain("ai_inference_ms_count{status=\"fallback\",provider=\"disabled\"} 1");
    expect(metrics.body).toContain("ai_fallback_count{reason=\"disabled_provider\",provider=\"disabled\"} 1");
  });

  it("OAuth 로그인 API는 토큰 검증 후 watch 토큰을 발급함", async () => {
    const repository = new MemoryRepository();
    const { app } = await buildServer({
      repository,
      oauthUserRepository,
      internalApiToken,
      oauthProxyToken,
      watchTokenSecret,
      watchTokenTtlSec: 120,
      allowedOrigins: ["http://localhost:3000"],
      wsBufferSize: 100,
      ollamaBaseUrl: "http://localhost:11434",
      ollamaModel: "gemma3:12b"
    });

    const denied = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/login",
      payload: {
        provider: "github",
        providerUserId: "1234",
        displayName: "Ray"
      }
    });
    expect(denied.statusCode).toBe(403);

    const allowed = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/login",
      headers: {
        "x-oauth-token": oauthProxyToken
      },
      payload: {
        provider: "github",
        providerUserId: "1234",
        displayName: "Ray",
        email: "ray@example.com"
      }
    });

    expect(allowed.statusCode).toBe(200);
    const body = allowed.json() as {
      accessToken: string;
      tokenType: string;
      expiresInSec: number;
      user: { displayName: string };
    };
    expect(body.tokenType).toBe("Bearer");
    expect(body.expiresInSec).toBe(120);
    expect(verifyWatchToken(body.accessToken, watchTokenSecret)).toBe(true);
    expect(body.user.displayName).toBe("Ray");
  });

  it("발급된 watch 토큰으로 auth session을 조회함", async () => {
    const repository = new MemoryRepository();
    const { app } = await buildServer({
      repository,
      oauthUserRepository,
      internalApiToken,
      oauthProxyToken,
      watchTokenSecret,
      watchTokenTtlSec: 120,
      allowedOrigins: ["http://localhost:3000"],
      wsBufferSize: 100,
      ollamaBaseUrl: "http://localhost:11434",
      ollamaModel: "gemma3:12b"
    });

    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/oauth/login",
      headers: {
        "x-oauth-token": oauthProxyToken
      },
      payload: {
        provider: "github",
        providerUserId: "1234",
        displayName: "Ray",
        email: "ray@example.com"
      }
    });
    expect(login.statusCode).toBe(200);

    const loginBody = login.json() as { accessToken: string };
    const session = await app.inject({
      method: "GET",
      url: "/api/v1/auth/session",
      headers: {
        "x-watch-token": loginBody.accessToken
      }
    });

    expect(session.statusCode).toBe(200);
    const body = authSessionResponseSchema.parse(session.json());
    expect(body.authSession).toEqual({
      kind: "oauth",
      userId: "github-1234",
      displayName: "Ray"
    });
  });

  it("ai predict는 gemini provider 설정을 server 경계까지 전달함", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: "0.5,0.3,0.2\nGemini strategy"
                  }
                ]
              }
            }
          ]
        })
      })
    );

    const repository = new MemoryRepository();
    const { app } = await buildServer({
      repository,
      oauthUserRepository,
      internalApiToken,
      oauthProxyToken,
      watchTokenSecret,
      watchTokenTtlSec: 120,
      allowedOrigins: ["http://localhost:3000"],
      wsBufferSize: 100,
      aiProvider: "gemini",
      ollamaBaseUrl: "http://localhost:11434",
      ollamaModel: "gemma3:12b",
      geminiApiKey: "gemini-api-key-for-test-123456",
      geminiModel: "gemini-2.5-flash"
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/ai/predict",
      headers: {
        "x-internal-token": internalApiToken
      },
      payload: {
        sessionId: "session-1",
        lap: 8,
        triggerDriverId: "NOR",
        snapshot: {
          ticks: [
            {
              sessionId: "session-1",
              driverId: "NOR",
              position: { x: 1, y: 2, z: 0 },
              speedKph: 312,
              lap: 8,
              rank: 2,
              timestampMs: 1000
            }
          ]
        }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
    );
    expect(vi.mocked(fetch).mock.calls[0]?.[1]).toMatchObject({
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": "gemini-api-key-for-test-123456"
      }
    });
    expect(response.json()).toMatchObject({
      reasoningSummary: "Gemini strategy"
    });

    const metrics = await app.inject({
      method: "GET",
      url: "/metrics",
      headers: {
        "x-internal-token": internalApiToken
      }
    });

    expect(metrics.statusCode).toBe(200);
    expect(metrics.body).toContain("ai_inference_ms_count{status=\"ok\",provider=\"gemini\"} 1");
  });

  it("ai predict는 disabled provider에서 fetch 없이 fallback으로 동작함", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const repository = new MemoryRepository();
    const { app } = await buildServer({
      repository,
      oauthUserRepository,
      internalApiToken,
      oauthProxyToken,
      watchTokenSecret,
      watchTokenTtlSec: 120,
      allowedOrigins: ["http://localhost:3000"],
      wsBufferSize: 100,
      aiProvider: "disabled",
      ollamaBaseUrl: "http://localhost:11434",
      ollamaModel: "gemma3:12b"
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/ai/predict",
      headers: {
        "x-internal-token": internalApiToken
      },
      payload: {
        sessionId: "session-disabled",
        lap: 8,
        triggerDriverId: "NOR",
        snapshot: {
          ticks: [
            {
              sessionId: "session-disabled",
              driverId: "NOR",
              position: { x: 1, y: 2, z: 0 },
              speedKph: 312,
              lap: 8,
              rank: 2,
              timestampMs: 1000
            }
          ]
        }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.json()).toMatchObject({
      sessionId: "session-disabled",
      triggerDriverId: "NOR"
    });

    const metrics = await app.inject({
      method: "GET",
      url: "/metrics",
      headers: {
        "x-internal-token": internalApiToken
      }
    });

    expect(metrics.statusCode).toBe(200);
    expect(metrics.body).toContain("ai_inference_ms_count{status=\"fallback\",provider=\"disabled\"} 1");
    expect(metrics.body).toContain("ai_fallback_count{reason=\"disabled_provider\",provider=\"disabled\"} 1");
  });
});
