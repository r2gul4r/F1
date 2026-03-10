import { createWatchToken, verifyWatchToken } from "@f1/shared/watch-token";
import { describe, expect, it } from "vitest";
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
});
