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
});
