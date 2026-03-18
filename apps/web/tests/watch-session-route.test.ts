import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "../app/api/auth/watch-session/route";

const expectedBody = {
  message: "요청 처리 실패"
};

describe("watch session route", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POST는 공개 웹 relay 비활성 경계를 503으로 고정함", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

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

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual(expectedBody);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("GET은 공개 웹 relay 비활성 경계를 503으로 고정함", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest("http://localhost:3000/api/auth/watch-session", {
      method: "GET",
      headers: {
        cookie: "f1_watch_session=watch-token-from-cookie"
      }
    });

    const response = await GET(request);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual(expectedBody);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("DELETE는 공개 웹 relay 비활성 경계를 503으로 고정함", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest("http://localhost:3000/api/auth/watch-session", {
      method: "DELETE"
    });

    const response = await DELETE(request);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual(expectedBody);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
