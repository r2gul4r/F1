import { afterEach, describe, expect, it, vi } from "vitest";
import { OpaqueError } from "@f1/shared";
import { OAuthLoginBridgeError, requestAuthSession, requestWatchSession } from "../src/lib/oauth-login";

describe("oauth login helper", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(process.env, "OAUTH_PROXY_TOKEN");
    Reflect.deleteProperty(process.env, "REALTIME_BASE_URL");
    Reflect.deleteProperty(process.env, "NEXT_PUBLIC_REALTIME_HTTP_BASE");
  });

  it("placeholder oauth proxy token이면 opaque error를 던짐", async () => {
    process.env.OAUTH_PROXY_TOKEN = "replace-with-strong-oauth-proxy-token-32chars";
    process.env.REALTIME_BASE_URL = "http://localhost:4001";

    await expect(
      requestWatchSession({
        provider: "github",
        providerUserId: "123",
        displayName: "Ray"
      })
    ).rejects.toBeInstanceOf(OpaqueError);
  });

  it("잘못된 realtime base url이면 opaque error를 던짐", async () => {
    process.env.OAUTH_PROXY_TOKEN = "oauth-proxy-token-for-test-123456";
    process.env.REALTIME_BASE_URL = "://bad-url";

    await expect(
      requestWatchSession({
        provider: "github",
        providerUserId: "123",
        displayName: "Ray"
      })
    ).rejects.toBeInstanceOf(OpaqueError);
  });

  it("watch session upstream 403은 403 bridge error로 매핑함", async () => {
    process.env.OAUTH_PROXY_TOKEN = "oauth-proxy-token-for-test-123456";
    process.env.REALTIME_BASE_URL = "http://localhost:4001";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403
      })
    );

    await expect(
      requestWatchSession({
        provider: "github",
        providerUserId: "123",
        displayName: "Ray"
      })
    ).rejects.toMatchObject<Partial<OAuthLoginBridgeError>>({
      status: 403
    });
  });

  it("watch session upstream non-403은 502 bridge error로 매핑함", async () => {
    process.env.OAUTH_PROXY_TOKEN = "oauth-proxy-token-for-test-123456";
    process.env.REALTIME_BASE_URL = "http://localhost:4001";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      })
    );

    await expect(
      requestWatchSession({
        provider: "github",
        providerUserId: "123",
        displayName: "Ray"
      })
    ).rejects.toMatchObject<Partial<OAuthLoginBridgeError>>({
      status: 502
    });
  });

  it("watch session 성공 시 parsed payload를 반환하고 oauth header를 붙임", async () => {
    process.env.OAUTH_PROXY_TOKEN = "oauth-proxy-token-for-test-123456";
    process.env.REALTIME_BASE_URL = "http://localhost:4001/";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        accessToken: "watch-token",
        tokenType: "Bearer",
        expiresInSec: 3600,
        user: {
          userId: "github-123",
          provider: "github",
          providerUserId: "123",
          displayName: "Ray",
          email: null,
          avatarUrl: null
        }
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestWatchSession({
      provider: "github",
      providerUserId: "123",
      displayName: "Ray"
    });

    expect(result).toMatchObject({
      accessToken: "watch-token",
      tokenType: "Bearer",
      expiresInSec: 3600
    });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4001/api/v1/auth/oauth/login", {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        "x-oauth-token": "oauth-proxy-token-for-test-123456"
      },
      body: JSON.stringify({
        provider: "github",
        providerUserId: "123",
        displayName: "Ray"
      })
    });
  });

  it("auth session 빈 watch token은 즉시 403 bridge error를 던짐", async () => {
    await expect(requestAuthSession("   ")).rejects.toMatchObject<Partial<OAuthLoginBridgeError>>({
      status: 403
    });
  });

  it("auth session upstream non-403은 502 bridge error로 매핑함", async () => {
    process.env.REALTIME_BASE_URL = "http://localhost:4001";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503
      })
    );

    await expect(requestAuthSession("watch-token")).rejects.toMatchObject<Partial<OAuthLoginBridgeError>>({
      status: 502
    });
  });

  it("auth session 성공 시 parsed payload를 반환하고 watch token header를 붙임", async () => {
    process.env.REALTIME_BASE_URL = "http://localhost:4001/";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tokenType: "Bearer",
        issuedAtMs: 1000,
        expiresAtMs: 2000,
        authSession: {
          kind: "oauth",
          userId: "github-123",
          displayName: "Ray"
        }
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestAuthSession("watch-token");

    expect(result).toMatchObject({
      tokenType: "Bearer",
      issuedAtMs: 1000,
      expiresAtMs: 2000
    });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4001/api/v1/auth/session", {
      method: "GET",
      cache: "no-store",
      headers: {
        "x-watch-token": "watch-token"
      }
    });
  });

  it("REALTIME_BASE_URL이 없으면 NEXT_PUBLIC_REALTIME_HTTP_BASE를 사용함", async () => {
    process.env.NEXT_PUBLIC_REALTIME_HTTP_BASE = "http://public-realtime:4001/";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tokenType: "Bearer",
        issuedAtMs: 1000,
        expiresAtMs: 2000,
        authSession: {
          kind: "oauth",
          userId: "github-123",
          displayName: "Ray"
        }
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    await requestAuthSession("watch-token");

    expect(fetchMock).toHaveBeenCalledWith("http://public-realtime:4001/api/v1/auth/session", {
      method: "GET",
      cache: "no-store",
      headers: {
        "x-watch-token": "watch-token"
      }
    });
  });
});
