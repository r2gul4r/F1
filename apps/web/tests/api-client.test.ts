import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient, ApiClientError } from "../src/lib/api";

describe("api client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("watch 토큰이 비어있으면 명시적 에러 코드로 실패함", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiClient.getCurrentSession("")).rejects.toMatchObject({
      code: "WATCH_TOKEN_MISSING"
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("에러 타입을 ApiClientError로 유지함", async () => {
    vi.stubGlobal("fetch", vi.fn());

    try {
      await apiClient.getCurrentSession(" ");
      expect.fail("실패가 필요함");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiClientError);
    }
  });

  it("HTTP 실패는 REQUEST_FAILED 코드로 전달함", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503
      })
    );

    await expect(apiClient.getCurrentSession("watch-token")).rejects.toMatchObject({
      code: "REQUEST_FAILED",
      status: 503
    });
  });

  it("성공 응답은 json payload를 그대로 반환함", async () => {
    const payload = { id: "session-1", name: "Bahrain GP" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => payload
      })
    );

    await expect(apiClient.getCurrentSession<typeof payload>("watch-token")).resolves.toEqual(payload);
  });

  it("getDrivers는 session path와 watch token header를 정확히 호출함", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => []
    });
    vi.stubGlobal("fetch", fetchMock);

    await apiClient.getDrivers("session-42", "watch-token");

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4001/api/v1/sessions/session-42/drivers", {
      cache: "no-store",
      headers: {
        "x-watch-token": "watch-token"
      }
    });
  });
});
