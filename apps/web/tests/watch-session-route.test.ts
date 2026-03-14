import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "../app/api/auth/watch-session/route";

describe("watch session route", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(process.env, "OAUTH_PROXY_TOKEN");
    Reflect.deleteProperty(process.env, "REALTIME_BASE_URL");
    Reflect.deleteProperty(process.env, "NEXT_PUBLIC_REALTIME_HTTP_BASE");
    Reflect.deleteProperty(process.env, "NODE_ENV");
  });

  it("OAuth 로그인 성공 시 httpOnly watch 세션 쿠키를 저장함", async () => {
    process.env.OAUTH_PROXY_TOKEN = "oauth-proxy-token-for-test-123456";
    process.env.REALTIME_BASE_URL = "http://realtime:4001";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        accessToken: "watch-token-from-upstream",
        tokenType: "Bearer",
        expiresInSec: 120,
        user: {
          userId: "user-1",
          provider: "github",
          providerUserId: "1234",
          displayName: "Ray",
          email: "ray@example.com",
          avatarUrl: "https://example.com/ray.png"
        }
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest("http://localhost:3000/api/auth/watch-session", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        provider: "github",
        providerUserId: "1234",
        displayName: "Ray",
        email: "ray@example.com",
        avatarUrl: "https://example.com/ray.png"
      })
    });

    const response = await POST(request);
    const body = (await response.json()) as {
      ok: boolean;
      user: { displayName: string };
      accessToken?: string;
    };

    expect(fetchMock).toHaveBeenCalledWith(
      "http://realtime:4001/api/v1/auth/oauth/login",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-oauth-token": "oauth-proxy-token-for-test-123456"
        })
      })
    );
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      user: {
        displayName: "Ray"
      }
    });
    expect(body.accessToken).toBeUndefined();

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("f1_watch_session=watch-token-from-upstream");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Max-Age=120");
    expect(setCookie).toContain("SameSite=lax");
  });

  it("production OAuth 로그인 성공 시 secure watch 세션 쿠키를 저장함", async () => {
    process.env.NODE_ENV = "production";
    process.env.OAUTH_PROXY_TOKEN = "oauth-proxy-token-for-test-123456";
    process.env.REALTIME_BASE_URL = "http://realtime:4001";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          accessToken: "watch-token-from-upstream",
          tokenType: "Bearer",
          expiresInSec: 120,
          user: {
            userId: "user-1",
            provider: "github",
            providerUserId: "1234",
            displayName: "Ray",
            email: "ray@example.com",
            avatarUrl: "https://example.com/ray.png"
          }
        })
      })
    );

    const request = new NextRequest("http://localhost:3000/api/auth/watch-session", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        provider: "github",
        providerUserId: "1234",
        displayName: "Ray",
        email: "ray@example.com",
        avatarUrl: "https://example.com/ray.png"
      })
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("Secure");
  });

  it("watch 세션 쿠키가 있으면 auth session을 조회함", async () => {
    process.env.REALTIME_BASE_URL = "http://realtime:4001";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tokenType: "Bearer",
        issuedAtMs: 1000,
        expiresAtMs: 2000,
        authSession: {
          kind: "oauth",
          userId: "user-1",
          displayName: "Ray"
        }
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest("http://localhost:3000/api/auth/watch-session", {
      method: "GET",
      headers: {
        cookie: "f1_watch_session=watch-token-from-cookie"
      }
    });

    const response = await GET(request);
    const body = (await response.json()) as {
      authSession: { kind: string; displayName: string };
    };

    expect(fetchMock).toHaveBeenCalledWith(
      "http://realtime:4001/api/v1/auth/session",
      expect.objectContaining({
        method: "GET",
        headers: {
          "x-watch-token": "watch-token-from-cookie"
        }
      })
    );
    expect(response.status).toBe(200);
    expect(body.authSession).toMatchObject({
      kind: "oauth",
      displayName: "Ray"
    });
  });

  it("OAuth 로그인 upstream 403은 route에서도 opaque 403으로 유지됨", async () => {
    process.env.OAUTH_PROXY_TOKEN = "oauth-proxy-token-for-test-123456";
    process.env.REALTIME_BASE_URL = "http://realtime:4001";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403
      })
    );

    const request = new NextRequest("http://localhost:3000/api/auth/watch-session", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        provider: "github",
        providerUserId: "1234",
        displayName: "Ray"
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      message: "요청 처리 실패"
    });
  });

  it("watch 세션 쿠키가 없으면 GET은 opaque 403으로 거부함", async () => {
    process.env.REALTIME_BASE_URL = "http://realtime:4001";

    const request = new NextRequest("http://localhost:3000/api/auth/watch-session", {
      method: "GET"
    });

    const response = await GET(request);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      message: "요청 처리 실패"
    });
  });

  it("OAuth 로그인 helper가 bridge error가 아닌 예외를 던지면 opaque 500으로 응답함", async () => {
    process.env.OAUTH_PROXY_TOKEN = "oauth-proxy-token-for-test-123456";
    process.env.REALTIME_BASE_URL = "://bad-url";

    const request = new NextRequest("http://localhost:3000/api/auth/watch-session", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        provider: "github",
        providerUserId: "1234",
        displayName: "Ray"
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      message: "요청 처리 실패"
    });
  });

  it("logout 요청은 watch 세션 쿠키를 지움", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/watch-session", {
      method: "DELETE"
    });

    const response = await DELETE(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("f1_watch_session=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("production logout은 secure clear-cookie를 반환함", async () => {
    process.env.NODE_ENV = "production";

    const request = new NextRequest("http://localhost:3000/api/auth/watch-session", {
      method: "DELETE"
    });

    const response = await DELETE(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("f1_watch_session=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(response.headers.get("set-cookie")).toContain("Secure");
  });
});
