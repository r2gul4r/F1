import { NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn()
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock
}));

import {
  clearWatchSessionCookie,
  readWatchSessionToken,
  setWatchSessionCookie,
  watchSessionCookieName
} from "../src/lib/watch-session-cookie";

describe("watch session cookie helper", () => {
  afterEach(() => {
    cookiesMock.mockReset();
    vi.unstubAllEnvs();
  });

  it("cookie value를 trim하고 비어 있으면 null을 반환함", async () => {
    cookiesMock.mockResolvedValueOnce({
      get: () => ({ value: "  watch-token  " })
    });
    await expect(readWatchSessionToken()).resolves.toBe("watch-token");

    cookiesMock.mockResolvedValueOnce({
      get: () => ({ value: "   " })
    });
    await expect(readWatchSessionToken()).resolves.toBeNull();

    cookiesMock.mockResolvedValueOnce({
      get: () => undefined
    });
    await expect(readWatchSessionToken()).resolves.toBeNull();
  });

  it("setWatchSessionCookie는 개발 환경에서 lax httpOnly 쿠키를 저장함", () => {
    const response = NextResponse.json({ ok: true });

    setWatchSessionCookie(response, "watch-token", 120);

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain(`${watchSessionCookieName}=watch-token`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=lax");
    expect(setCookie).toContain("Max-Age=120");
    expect(setCookie).not.toContain("Secure");
  });

  it("setWatchSessionCookie는 production에서 secure 쿠키를 저장함", () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = NextResponse.json({ ok: true });

    setWatchSessionCookie(response, "watch-token", 120);

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain(`${watchSessionCookieName}=watch-token`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=lax");
    expect(setCookie).toContain("Max-Age=120");
    expect(setCookie).toContain("Secure");
  });

  it("clearWatchSessionCookie는 production에서 secure 삭제 쿠키를 저장함", () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = NextResponse.json({ ok: true });

    clearWatchSessionCookie(response);

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain(`${watchSessionCookieName}=`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=lax");
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("Secure");
  });
});
