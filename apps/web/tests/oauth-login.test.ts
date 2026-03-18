import { afterEach, describe, expect, it, vi } from "vitest";
import { OAuthLoginBridgeError, requestAuthSession, requestWatchSession } from "../src/lib/oauth-login";

describe("oauth login helper", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("watch session helper는 relay-disabled 503 bridge error를 반환함", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestWatchSession({
        provider: "github",
        providerUserId: "123",
        displayName: "Ray"
      })
    ).rejects.toMatchObject({
      status: 503
    } as Partial<OAuthLoginBridgeError>);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("auth session helper는 relay-disabled 503 bridge error를 반환함", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestAuthSession("watch-token")).rejects.toMatchObject({
      status: 503
    } as Partial<OAuthLoginBridgeError>);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
