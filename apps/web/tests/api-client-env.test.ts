import { afterEach, describe, expect, it, vi } from "vitest";

describe("api client env base url", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    Reflect.deleteProperty(process.env, "NEXT_PUBLIC_REALTIME_HTTP_BASE");
  });

  it("NEXT_PUBLIC_REALTIME_HTTP_BASE를 module import 시 base url로 사용함", async () => {
    process.env.NEXT_PUBLIC_REALTIME_HTTP_BASE = "http://public-realtime:4100";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true })
    });
    vi.stubGlobal("fetch", fetchMock);

    const { apiClient } = await import("../src/lib/api");
    await apiClient.getCurrentSession("watch-token");

    expect(fetchMock).toHaveBeenCalledWith("http://public-realtime:4100/api/v1/sessions/current", {
      cache: "no-store",
      headers: {
        "x-watch-token": "watch-token"
      }
    });
  });
});
