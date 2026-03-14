import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn()
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock
}));

import WatchPage from "../app/watch/[sessionId]/page";

vi.mock("@/src/components/watch-client", () => ({
  WatchClient: ({ sessionId, watchToken }: { sessionId: string; watchToken: string }) => (
    <div data-testid="watch-client">{`${sessionId}:${watchToken}`}</div>
  )
}));

vi.mock("@/src/components/watch-preview-client", () => ({
  WatchPreviewClient: () => <div data-testid="watch-preview">preview</div>
}));

describe("watch page", () => {
  afterEach(() => {
    cleanup();
    cookiesMock.mockReset();
  });

  it("watch 세션 쿠키가 있으면 watch client를 렌더링함", async () => {
    cookiesMock.mockResolvedValue({
      get: (name: string) => (name === "f1_watch_session" ? { name, value: "watch-cookie-token" } : undefined)
    });

    const page = await WatchPage({
      params: Promise.resolve({ sessionId: "current" })
    });
    render(page);

    expect(screen.getByTestId("watch-client").textContent).toBe("current:watch-cookie-token");
  });

  it("watch 세션 쿠키가 없으면 fallback을 렌더링함", async () => {
    cookiesMock.mockResolvedValue({
      get: () => undefined
    });

    const page = await WatchPage({
      params: Promise.resolve({ sessionId: "current" })
    });
    render(page);

    expect(screen.getByText("요청 처리 실패")).toBeTruthy();
    expect(screen.queryByTestId("watch-client")).toBeNull();
  });

  it("preview 세션이면 watch 세션 쿠키 없이도 preview client를 렌더링함", async () => {
    cookiesMock.mockResolvedValue({
      get: () => undefined
    });

    const page = await WatchPage({
      params: Promise.resolve({ sessionId: "preview" })
    });
    render(page);

    expect(screen.getByTestId("watch-preview")).toBeTruthy();
    expect(screen.queryByTestId("watch-client")).toBeNull();
  });

  it("preview 세션이면 쿠키가 있어도 cookie lookup 없이 preview client를 우선 렌더링함", async () => {
    cookiesMock.mockResolvedValue({
      get: (name: string) => (name === "f1_watch_session" ? { name, value: "watch-cookie-token" } : undefined)
    });

    const page = await WatchPage({
      params: Promise.resolve({ sessionId: "preview" })
    });
    render(page);

    expect(screen.getByTestId("watch-preview")).toBeTruthy();
    expect(screen.queryByTestId("watch-client")).toBeNull();
    expect(cookiesMock).not.toHaveBeenCalled();
  });
});
