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
});
