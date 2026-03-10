import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import WatchPage from "../app/watch/[sessionId]/page";

vi.mock("@/src/components/watch-client", () => ({
  WatchClient: ({ sessionId, watchToken }: { sessionId: string; watchToken: string }) => (
    <div data-testid="watch-client">{`${sessionId}:${watchToken}`}</div>
  )
}));

describe("watch page", () => {
  afterEach(() => {
    delete process.env.WATCH_TOKEN_SECRET;
  });

  it("시크릿이 약하면 fallback을 렌더링함", async () => {
    process.env.WATCH_TOKEN_SECRET = "token";

    const page = await WatchPage({
      params: Promise.resolve({ sessionId: "current" })
    });
    render(page);

    expect(screen.getByText("요청 처리 실패")).toBeTruthy();
    expect(screen.queryByTestId("watch-client")).toBeNull();
  });
});
